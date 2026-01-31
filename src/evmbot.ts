import { config } from "./config/config.js";
import { Bot, Context, InputFile } from "grammy";
import { createPublicClient, http, Address } from "viem";
import { EVM } from "./modules/evm-opcodes.js";
import { groupcall } from "./groupcall/groupcall-viem.js";
import { decodeResp } from "./modules/try-decode-resp.js";
import { applyDefaults } from "./bot/apply-defaults.js";
import { MulticallCall } from "./groupcall/calldata.js";
import { validateEVMAddress } from "./helpers/address-validator.js";
import { checkContractInNetwork } from "./helpers/network-checker.js";
import { openchain, fourByte } from "./helpers/signature-resolver.js";
import { isCallableSignature, extractFunctionName } from "./helpers/contract-utils.js";
import { detectProxyImplementation } from "./modules/proxy-implementation.js";
import { START_HELP_BUTTONS, START_HELP_CAPTION } from "./constants/bot-messages.js";

/**
 * Bot initialization with global settings
 */
const bot = new Bot(config.bot_token);
const POLLING = true;

// Set global default options for the bot
bot.api.config.use((prev, method, payload) => {
    applyDefaults(method, payload);
    return prev(method, payload);
});

// Load the image file
let decoImage: InputFile | undefined;

try {
    decoImage = new InputFile("./assets/deco.png");
    console.log("✅ Deco image loaded successfully");
} catch (error) {
    console.warn("⚠️ Could not load deco.png, falling back to text-only messages");
}

/**
 * /start command
 */
bot.command("start", async (ctx) => {
    await sendWelcomeMessage(ctx);
});

/**
 * /help command
 */
bot.command("help", async (ctx) => {
    await sendWelcomeMessage(ctx);
});

/**
 * Sends welcome/help message with image if available
 */
async function sendWelcomeMessage(ctx: Context) {
    try {
        if (decoImage) {
            await ctx.replyWithPhoto(decoImage, {
                caption: START_HELP_CAPTION,
                ...START_HELP_BUTTONS
            });
        } else {
            await ctx.reply(START_HELP_CAPTION, {
                ...START_HELP_BUTTONS
            });
        }
    } catch (error) {
        console.error("Error sending welcome message:", error);
        // Fallback to text-only message on error
        await ctx.reply(START_HELP_CAPTION, {
            ...START_HELP_BUTTONS
        });
    }
}

/**
 * Processes user contract (decompilation and function calls)
 */
async function processUserContract(
    address: Address,
    rpc: string,
    chatId: number,
    networkName: string,
    isProxy: boolean = false
): Promise<void> {
    try {
        // Send processing message
        const processingMsg = await bot.api.sendMessage(
            chatId,
            `<b><i>⌛ Decompiling and Calling Contract Methods...</i></b>\n`
        );

        // Create client for the network
        const client = createPublicClient({
            transport: http(rpc),
        });

        // Get contract bytecode
        const bytecode = await client.getCode({ address });

        if (!bytecode || bytecode === "0x") {
            await bot.api.sendMessage(
                chatId,
                `<b><i>⛔️ Contract <code>${address}</code> was not found in ${networkName} network</i></b>`
            );
            return;
        }

        // Calculate bytecode size
        const bytecodeSize = (bytecode.length - 2) / 2; // Remove '0x' prefix (2 chars), each byte is 2 hex chars

        // Parse bytecode and extract selectors
        const evm = new EVM(bytecode);
        const selectorsWith0x = evm.getSelectors();

        // Resolve function signatures
        const resolvedSelectors: { [key: string]: string | undefined } = {};

        for (const selector of selectorsWith0x) {
            let resolvedName: string | undefined;

            // Try OpenChain first
            const openchainResult = await openchain(selector);
            if (openchainResult !== selector) {
                resolvedName = openchainResult;
            } else {
                // Fall back to 4byte
                const fourByteResult = await fourByte(selector);
                if (fourByteResult !== selector) {
                    resolvedName = fourByteResult;
                }
            }

            // Use undefined if no match found
            resolvedSelectors[selector] = resolvedName !== selector ? resolvedName : undefined;
        }

        // Separate functions into callable and non-callable
        const callableFunctions: {
            [selector: string]: {
                signature?: string;
                functionName?: string;
                response?: string | null;
                decoded?: string | null;
                revert?: string | null;
            }
        } = {};

        const nonCallableFunctions: {
            [selector: string]: {
                signature?: string;
                functionName?: string;
            }
        } = {};

        // Classify functions
        Object.entries(resolvedSelectors).forEach(([selector, signature]) => {
            if (isCallableSignature(signature)) {
                callableFunctions[selector] = {
                    signature,
                    functionName: signature ? extractFunctionName(signature) : undefined
                };
            } else {
                nonCallableFunctions[selector] = {
                    signature,
                    functionName: signature ? extractFunctionName(signature) : undefined
                };
            }
        });

        // Prepare calls for callable functions
        const calls: MulticallCall[] = Object.keys(callableFunctions).map(selector => ({
            target: address,
            callData: selector as Address,
        }));

        // Execute calls
        if (calls.length > 0) {
            const senderAddress: Address = "0xa180Fe01B906A1bE37BE6c534a3300785b20d947";

            try {
                const results = await groupcall(client, senderAddress, calls);

                // Process results
                results.forEach((result, index) => {
                    const selector = Object.keys(callableFunctions)[index];
                    const functionInfo = callableFunctions[selector];

                    if (result.success) {
                        const decoded = decodeResp(result.returnData);
                        callableFunctions[selector] = {
                            ...functionInfo,
                            response: result.returnData,
                            decoded: decoded,
                            revert: null
                        };
                    } else {
                        callableFunctions[selector] = {
                            ...functionInfo,
                            response: null,
                            decoded: null,
                            revert: result.revertReason
                        };
                    }
                });
            } catch (error) {
                console.error("Error executing calls:", error);
            }
        }

        // Delete processing message
        await bot.api.deleteMessage(chatId, processingMsg.message_id);

        // Build final message
        let responseText = '';

        if (isProxy) {
            responseText += `Proxy Contract: \n<code>${address}</code>\n\n`;
        } else {
            responseText += `Contract: \n<code>${address}</code>\n\n`;
        }

        // Add statistics at the top
        responseText += `<i>📊 Statistics:</i>\n`;
        responseText += `Bytecode size: ${bytecodeSize} bytes\n`;
        responseText += `Total selectors: ${selectorsWith0x.length}\n\n`;

        // ERC20 functions first (if present)
        const erc20Selectors = ['0x06fdde03', '0x95d89b41', '0x313ce567', '0x18160ddd'];

        // Add ERC20 functions
        erc20Selectors.forEach(selector => {
            if (callableFunctions[selector]) {
                const func = callableFunctions[selector];
                responseText += `<code>${selector}</code> ${func.signature || 'unknown'}\n`;
                if (func.decoded) {
                    responseText += `➥ <code>${func.decoded || '0x0'}</code>\n\n`;
                } else if (func.revert) {
                    responseText += `➥ <code>${func.revert}</code>\n\n`;
                } else {
                    responseText += `\n`;
                }
            }
        });

        // Then other callable functions
        Object.entries(callableFunctions).forEach(([selector, func]) => {
            if (!erc20Selectors.includes(selector)) {
                responseText += `<code>${selector}</code> ${func.signature || 'unknown'}\n`;
                if (func.decoded) {
                    responseText += `➥ <code>${func.decoded || '0x0'}</code>\n\n`;
                } else if (func.revert) {
                    responseText += `➥ <code>${func.revert}</code>\n\n`;
                } else {
                    responseText += `\n`;
                }
            }
        });

        // Non-callable functions
        Object.entries(nonCallableFunctions).forEach(([selector, func]) => {
            responseText += `<code>${selector}</code> ${func.signature || 'unknown'}\n\n`;
        });

        // Send result
        await bot.api.sendMessage(chatId, responseText);

    } catch (error) {
        console.error("Error processing contract:", error);
        await bot.api.sendMessage(
            chatId,
            `<b><i>⚠️ Undefined error during decompilation!</i></b>`
        );
    }
}

/**
 * Processes user request
 */
async function processUserRequest(text: string, chatId: number): Promise<void> {
    // Validate if text is a valid EVM address
    const address = validateEVMAddress(text);

    if (!address) {
        await bot.api.sendMessage(
            chatId,
            "❌ <b>Invalid EVM address</b>\n\nPlease send a correct contract address (e.g., 0x...)."
        );
        return;
    }

    // Send checking message
    const checkingMsg = await bot.api.sendMessage(
        chatId,
        "🔍 <b>Checking address in networks...</b>"
    );

    try {
        // Check address in all networks
        const networkPromises = Object.entries(config.networks).map(async ([networkName, networkConfig]) => {
            const result = await checkContractInNetwork(networkConfig.rpc, address);
            return {
                network: networkName,
                rpc: networkConfig.rpc,
                isContract: result.isContract,
                isProxy: result.isProxy,
                implementation: result.implementation,
            };
        });

        const allResults = await Promise.all(networkPromises);
        const contractResults = allResults.filter(result => result.isContract);

        // Delete checking message
        await bot.api.deleteMessage(chatId, checkingMsg.message_id);

        // If contract not found in any network
        if (contractResults.length === 0) {
            await bot.api.sendMessage(
                chatId,
                `❌ <b>Address not found</b>\n\n<code>${address}</code>\n\nThis address is not a smart contract in any of the bot's supported networks.`
            );
            return;
        }

        // If contract found in multiple networks
        if (contractResults.length > 1) {
            let messageText = `✅ <b>Address found in multiple networks</b>\n\n<code>${address}</code>\n\n<b>Available in networks:</b>\n\n`;

            // Create inline keyboard
            const keyboard = contractResults.map(result => [
                {
                    text: `${result.network} : ${result.isProxy ? 'Proxy Contract' : 'Single Contract'}`,
                    callback_data: `network_${result.network}_${address}_${result.isProxy ? 'proxy' : 'single'}`
                }
            ]);

            await bot.api.sendMessage(
                chatId,
                messageText,
                {
                    reply_markup: {
                        inline_keyboard: keyboard
                    }
                }
            );
            return;
        }

        // If contract found in only one network
        const result = contractResults[0];

        let messageText = `✅ <b>Address found</b>\n\n<code>${address}</code>\n\n`;
        messageText += `<b>Available in ${result.network}:</b> ${result.isProxy ? 'Proxy Contract' : 'Single Contract'}\n\n`;

        if (result.isProxy) {
            messageText += `<b>Implementation:</b>\n<code>${result.implementation}</code>\n\n`;
        }

        messageText += `<i>Processing bytecode...</i>`;

        await bot.api.sendMessage(chatId, messageText);

        // Start contract processing
        const contractAddress = result.isProxy ? result.implementation : address;
        await processUserContract(contractAddress, result.rpc, chatId, result.network, result.isProxy);

    } catch (error) {
        console.error("Error checking networks:", error);
        await bot.api.sendMessage(
            chatId,
            "⚠️ <b>An error occurred while checking networks</b>"
        );
    }
}

/**
 * Handle callback queries from inline keyboard
 */
bot.callbackQuery(/^network_(.+)_(0x[a-fA-F0-9]+)_(proxy|single)$/, async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const [, network, address, type] = callbackData.match(/^network_(.+)_(0x[a-fA-F0-9]+)_(proxy|single)$/) || [];

    if (!network || !address) {
        await ctx.answerCallbackQuery("Invalid callback data");
        return;
    }

    // Get network configuration
    const networkConfig = config.networks[network as keyof typeof config.networks];
    if (!networkConfig) {
        await ctx.answerCallbackQuery("Network not found");
        return;
    }

    // Delete previous message with buttons
    await ctx.deleteMessage();

    // Send processing message
    const chatId = ctx.callbackQuery.message?.chat.id;
    if (!chatId) return;

    let messageText = `✅ <b>Selected network: ${network}</b>\n\n<code>${address}</code>\n\n`;
    messageText += `<b>Type:</b> ${type === 'proxy' ? 'Proxy Contract' : 'Single Contract'}\n\n`;

    if (type === 'proxy') {
        // For proxy, get implementation address
        const client = createPublicClient({
            transport: http(networkConfig.rpc),
        });


        const proxyInfo = await detectProxyImplementation(client, address as Address);

        if (proxyInfo.isProxy) {
            messageText += `<b>Implementation:</b>\n<code>${proxyInfo.implementation}</code>\n\n`;
            messageText += `<i>Processing bytecode...</i>`;

            await bot.api.sendMessage(chatId, messageText);

            // Process implementation contract
            await processUserContract(proxyInfo.implementation, networkConfig.rpc, chatId, network, true);
        } else {
            await bot.api.sendMessage(
                chatId,
                "⚠️ <b>Error: Contract is not a proxy</b>"
            );
        }
    } else {
        messageText += `<i>Processing bytecode...</i>`;

        await bot.api.sendMessage(chatId, messageText);

        // Process regular contract
        await processUserContract(address as Address, networkConfig.rpc, chatId, network, false);
    }

    await ctx.answerCallbackQuery();
});

/**
 * Handle text messages (non-command)
 */
bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const chatId = ctx.message.chat.id;

    // Skip processing if text starts with '/' (commands are handled separately)
    if (text.startsWith('/')) {
        return;
    }

    // Process request asynchronously
    processUserRequest(text, chatId).catch(error => {
        console.error("Error processing user request:", error);
        ctx.reply("⚠️ An error occurred while processing your request");
    });
});

/**
 * Bot startup
 */
if (POLLING) {
    console.log("🤖 Starting EVM Bytecode Decompiler Bot...");
    bot.start().catch(err => {
        console.error(err);
        process.exit(1);
    })
}