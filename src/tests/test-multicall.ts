import { config } from "../config/config.js";
import { createPublicClient, http, Hex } from "viem";
import { MulticallCall } from "../groupcall/calldata.js"
import { multicall } from "../groupcall/multicall-viem.js";
import { groupcall } from "../groupcall/groupcall-viem.js";

const CONTRACT = "0x925c8Ab7A9a8a148E87CD7f1EC7ECc3625864444";
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";

/**
 * Blockchain client for interacting with BSC
 */
const client = createPublicClient({
    transport: http(config.networks.BSC.rpc),
});

/**
 * Main test function to compare multicall and groupcall functionality
 * @async
 * @function main
 * @description
 * Creates a client for BSC network, generates a list of calls to a contract
 * and executes them in two ways:
 * 1. Via Multicall3 contract (aggregated call)
 * 2. In parallel via groupcall (separate calls)
 * Outputs results for performance comparison and revert reason retrieval
 */
async function run() {
    const selectors: Hex[] = [
        "0x06fdde03",
        "0x095ea7b3",
        "0x18160ddd",
        "0x1c8fc2c0",
        "0x23b872dd",
        "0x2eabc917",
        "0x313ce567",
        "0x32be6330",
        "0x39509351",
        "0x3af3d783",
        "0x4e487b71",
        "0x70a08231",
        "0x715018a6",
        "0x72657373",
        "0x8da5cb5b",
        "0x95d89b41",
        "0xa457c2d7",
        "0xa9059cbb",
        "0xc5c03af3",
        "0xd72dd3b4",
        "0xdd62ed3e",
        "0xf2fde38b",
    ];

    const calls: MulticallCall[] = selectors.map(selector => ({
        target: CONTRACT,
        callData: selector,
    }));

    console.log("=== MULTICALL ===");

    const result_multicall = await multicall(
        client,
        MULTICALL3,
        calls
    );

    result_multicall.forEach((res, i) => {
        console.log(
            selectors[i],
            "success:",
            res.success,
            "returnData:",
            res.returnData
        );
    });

    console.log("\n=== GROUPCALL (revert reasons) ===");

    const result_groupcall = await groupcall(
        client,
        "0xa180Fe01B906A1bE37BE6c534a3300785b20d947",
        calls
    );

    result_groupcall.forEach((res, i) => {
        console.log(
            selectors[i],
            "success:",
            res.success,
            "returnData:",
            res.returnData,
            "revertReason:",
            res.revertReason
        );
    });
}

// Execute main function with error handling
run().catch(err => {
    console.error(err);
    process.exit(1);
});
