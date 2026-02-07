import {config} from "../config/config.js";
import {createPublicClient, Hex, http} from 'viem';
import { EVM } from "evm-selector-extractor";
import {groupcall} from "../groupcall/groupcall-viem.js";
import {decodeResp} from "../modules/try-decode-resp.js";
import {MulticallCall} from "../groupcall/calldata.js";

/**
 * Blockchain client for interacting with BSC
 */
const client = createPublicClient({
    transport: http(config.networks.BSC.rpc),
});

/**
 * Ethereum (BSC) contract address for which to analyze bytecode and extract function signatures
 */
const CONTRACT_ADDRESS: `0x${string}` = "0x925c8Ab7A9a8a148E87CD7f1EC7ECc3625864444";

/**
 * Fetches function signature from OpenChain API
 * @param selector - Function selector (e.g., '0xa9059cbb')
 * @returns Function name or original selector if not found
 */
async function openchain(selector: string): Promise<string> {
    try {
        const response = await fetch(`https://api.4byte.sourcify.dev/signature-database/v1/lookup?function=${selector}&filter=true`);
        const data = await response.json();
        if (data.result.function[selector]) {
            return data.result.function[selector][0].name;
        }
    } catch (error) {
        // Silently fail and return selector
    }
    return selector;
}

/**
 * Fetches function signature from 4byte directory API
 * @param selector - Function selector (e.g., '0xa9059cbb')
 * @returns Function signature or original selector if not found
 */
async function fourByte(selector: string): Promise<string> {
    try {
        const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return data.results[0]['text_signature'];
        }
    } catch (error) {
        // Silently fail and return selector
    }
    return selector;
}

/**
 * Checks if a function signature is callable (has no arguments)
 * @param signature - Function signature string
 * @returns True if function has no arguments
 */
function isCallableSignature(signature: string | undefined): boolean {
    if (!signature) return true; // Unknown signature - try to call it
    return signature.endsWith('()');
}

/**
 * Extracts function name from signature (removes arguments)
 * @param signature - Function signature string
 * @returns Function name without arguments
 */
function extractFunctionName(signature: string): string {
    if (signature.includes('(')) {
        return signature.split('(')[0];
    }
    return signature;
}

/**
 * Main function to extract and resolve function selectors from contract bytecode
 * and test callable functions
 */
async function run() {
    // Validate configuration
    if (!CONTRACT_ADDRESS) {
        console.error('Contract address is not configured');
        return;
    }

    // Fetch contract bytecode from blockchain
    const bytecode = await client.getCode({
        address: CONTRACT_ADDRESS,
    });

    if (!bytecode) {
        console.error('No bytecode found for address:', CONTRACT_ADDRESS);
        return;
    }

    // Parse bytecode and extract opcodes
    const evm = new EVM(bytecode);

    // Get unique selectors with 0x prefix
    const selectorsWith0x = evm.getSelectors()

    // Resolve function signatures for each selector
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

    // Output resolved selectors
    console.log("=== RESOLVED SELECTORS ===");
    console.log(resolvedSelectors);
    console.log("\n");

    // Separate functions into callable and non-callable
    const callableFunctions: {
        [selector: string]: {
            signature?: string;
            response?: Hex | null;
            decoded?: string | null;
            revert?: string | null;
            functionName?: string;
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
        target: CONTRACT_ADDRESS,
        callData: selector as Hex,
    }));

    console.log(`=== CALLABLE FUNCTIONS (${Object.keys(callableFunctions).length}) ===`);

    if (calls.length > 0) {
        // Execute calls using groupcall
        const senderAddress: `0x${string}` = "0xa180Fe01B906A1bE37BE6c534a3300785b20d947";

        try {
            const results = await groupcall(
                client,
                senderAddress,
                calls
            );

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

            // Display callable functions with results
            Object.entries(callableFunctions).forEach(([selector, info]) => {
                console.log(`\n${selector}:`);
                console.log(`  Signature: ${info.signature || 'unknown'}`);
                console.log(`  Function: ${info.functionName || 'unknown'}`);
                if (info.response !== undefined) {
                    console.log(`  Success: ${info.revert ? '❌' : '✅'}`);
                    if (info.response) {
                        console.log(`  Response: ${info.response}`);
                    }
                    if (info.decoded) {
                        console.log(`  Decoded: ${info.decoded}`);
                    }
                    if (info.revert) {
                        console.log(`  Revert: ${info.revert}`);
                    }
                } else {
                    console.log(`  Status: Not called`);
                }
            });

        } catch (error) {
            console.error("Error executing calls:", error);
        }
    } else {
        console.log("No callable functions found.");
    }

    console.log(`\n\n=== NON-CALLABLE FUNCTIONS (${Object.keys(nonCallableFunctions).length}) ===`);

    if (Object.keys(nonCallableFunctions).length > 0) {
        Object.entries(nonCallableFunctions).forEach(([selector, info]) => {
            console.log(`\n${selector}:`);
            console.log(`  Signature: ${info.signature || 'unknown'}`);
            console.log(`  Function: ${info.functionName || 'unknown'}`);
            console.log(`  Status: Requires arguments`);
        });
    } else {
        console.log("No non-callable functions found.");
    }

    // Summary
    console.log(`\n\n=== SUMMARY ===`);
    console.log(`Total selectors found: ${selectorsWith0x.length}`);
    console.log(`Callable functions: ${Object.keys(callableFunctions).length}`);
    console.log(`Non-callable functions: ${Object.keys(nonCallableFunctions).length}`);

    // Count successful calls
    const successfulCalls = Object.values(callableFunctions).filter(f => f.revert === null).length;
    const failedCalls = Object.values(callableFunctions).filter(f => f.revert !== null).length;

    console.log(`Successful calls: ${successfulCalls}`);
    console.log(`Failed calls: ${failedCalls}`);
}

// Execute main function with error handling
run().catch(err => {
    console.error(err);
    process.exit(1);
});
