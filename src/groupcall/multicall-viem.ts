import {decodeFunctionResult, encodeFunctionData, Hex, PublicClient} from "viem";
import {MulticallCall} from "./calldata.js"

/**
 * Multicall contract ABI for tryAggregate function
 * @constant multicallAbi
 */
const multicallAbi = [
    {
        type: "function",
        name: "tryAggregate",
        stateMutability: "view",
        inputs: [
            {
                name: "requireSuccess",
                type: "bool",
            },
            {
                name: "calls",
                type: "tuple[]",
                components: [
                    { name: "target", type: "address" },
                    { name: "callData", type: "bytes" },
                ],
            },
        ],
        outputs: [
            {
                name: "returnData",
                type: "tuple[]",
                components: [
                    { name: "success", type: "bool" },
                    { name: "returnData", type: "bytes" },
                ],
            },
        ],
    },
] as const;

/**
 * Executes multicall via Multicall3 contract
 * @async
 * @function multicall
 * @param {PublicClient} client - Viem PublicClient for blockchain interaction
 * @param {string} multicallAddress - Multicall3 contract address
 * @param {MulticallCall[]} calldata - Array of calls to aggregate
 * @returns {Promise<Array<{success: boolean; returnData: Hex}>>}
 *          Promise that resolves to an array of results with success flag and return data
 */
export async function multicall(
    client: PublicClient,
    multicallAddress: string,
    calldata: MulticallCall[]
): Promise<Array<{ success: boolean; returnData: Hex }>> {
    if (calldata.length === 0) {
        return [];
    }

    const data = encodeFunctionData({
        abi: multicallAbi,
        functionName: "tryAggregate",
        args: [
            false,
            calldata.map(call => ({
                target: call.target as Hex,
                callData: call.callData,
            })),
        ],
    });

    const result = await client.call({
        to: multicallAddress as Hex,
        data,
    });

    if (!result.data) {
        return [];
    }

    return decodeFunctionResult({
        abi: multicallAbi,
        functionName: "tryAggregate",
        data: result.data,
    }) as Array<{ success: boolean; returnData: Hex }>;
}