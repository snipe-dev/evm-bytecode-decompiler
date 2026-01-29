import { PublicClient, Hex } from "viem";
import { MulticallCall } from "./calldata.js"

/**
 * Executes a group of contract calls in parallel and returns detailed results
 * @async
 * @function groupcall
 * @param {PublicClient} client - Viem PublicClient for blockchain interaction
 * @param {`0x${string}`} account - Sender address (msg.sender)
 * @param {MulticallCall[]} calldata - Array of calls to execute
 * @returns {Promise<Array<{success: boolean; returnData: Hex; revertReason: string}>>}
 *          Promise that resolves to an array of results with success flag,
 *          return data, and revert reason (if any)
 */
export async function groupcall(
    client: PublicClient,
    account: `0x${string}`,
    calldata: MulticallCall[]
): Promise<Array<{ success: boolean; returnData: Hex; revertReason: string }>> {
    return Promise.all(
        calldata.map(async (call) => {
            try {
                const result = await client.call({
                    account: account,
                    to: call.target as Hex,
                    data: call.callData,
                });

                return {
                    success: true,
                    returnData: (result.data ?? "0x") as Hex,
                    revertReason: "",
                };
            } catch (error: any) {
                let revertReason = "";

                if (typeof error?.details === "string") {
                    revertReason = normalizeRevertReason(error.details);
                } else {
                    revertReason = "execution reverted";
                }

                return {
                    success: false,
                    returnData: "0x",
                    revertReason,
                };
            }
        })
    );
}

/**
 * Normalizes transaction revert reason text
 * @function normalizeRevertReason
 * @param {string} input - Original error text
 * @returns {string} Normalized revert reason
 */
function normalizeRevertReason(input: string): string {
    if (!input) {
        return "execution reverted";
    }

    let text = input;

    const hexIndex = text.indexOf("0x");
    if (hexIndex !== -1) {
        text = text.slice(0, hexIndex);
    }

    text = text.trim();

    const prefix = "execution reverted";
    if (text.toLowerCase().startsWith(prefix)) {
        text = text.slice(prefix.length);
    }

    text = text.trim();
    text = text.replace(/^[:\s]+/, "");
    text = text.replace(/[:\s]+$/, "");

    if (!text) {
        return "execution reverted";
    }

    if (text.length <= 10) {
        return `execution reverted: ${text}`;
    }

    return text;
}