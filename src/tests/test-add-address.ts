import { config } from "../config/config.js";
import { createPublicClient, http, Address } from 'viem';
import { detectProxyImplementation } from "../modules/proxy-implementation.js";

/**
 * Checks contract availability and type for the specified RPC
 * @param rpc - RPC endpoint URL
 * @param address - Contract address to check
 * @returns Object containing contract information including proxy status
 */
async function isContractAvailable(
    rpc: string,
    address: Address
): Promise<{
    address: Address;
    isContract: boolean;
    contractBytecode: string;
    isProxy: boolean;
    implementation: Address;
    implementationBytecode: string;
}> {
    const client = createPublicClient({
        transport: http(rpc),
    });

    const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;

    // Get contract bytecode
    const bytecode = await client.getCode({
        address,
    });

    // If bytecode is empty - not a contract
    if (!bytecode || bytecode === "0x") {
        return {
            address,
            isContract: false,
            contractBytecode: "0x",
            isProxy: false,
            implementation: zeroAddress,
            implementationBytecode: "0x",
        };
    }

    // Check if contract is a proxy
    const proxyInfo = await detectProxyImplementation(client, address);

    return {
        address,
        isContract: true,
        contractBytecode: bytecode,
        isProxy: proxyInfo.isProxy,
        implementation: proxyInfo.isProxy ? proxyInfo.implementation : zeroAddress,
        implementationBytecode: proxyInfo.isProxy ? proxyInfo.implementationBytecode : "0x",
    };
}

/**
 * Main function to check contract across all networks
 * @returns Array of contract results for networks where contract exists
 */
async function run(): Promise<Array<{
    network: string;
    rpc: string;
    address: Address;
    isContract: boolean;
    isProxy: boolean;
    implementation: Address;
    implementationBytecode: string;
}>> {
    const CONTRACT_ADDRESS: `0x${string}` = "0x5c952063c7fc8610FFDB798152D69F0B9550762b";

    // Create promises for checking all networks
    const networkPromises = Object.entries(config.networks).map(async ([networkName, networkConfig]) => {
        const result = await isContractAvailable(networkConfig.rpc, CONTRACT_ADDRESS);

        return {
            network: networkName,
            rpc: networkConfig.rpc,
            address: result.address,
            isContract: result.isContract,
            isProxy: result.isProxy,
            implementation: result.implementation,
            implementationBytecode: result.implementationBytecode,
        };
    });

    try {
        // Execute all checks in parallel
        const allResults = await Promise.all(networkPromises);

        // Filter only networks where address is a contract
        const contractResults = allResults.filter(result => result.isContract);

        // Display results
        console.log("=== CONTRACT CHECK RESULTS ACROSS NETWORKS ===");
        console.log(`Total networks checked: ${allResults.length}`);
        console.log(`Networks with contract: ${contractResults.length}`);
        console.log("\n");

        // Detailed results per network
        allResults.forEach((result, index) => {
            console.log(`${index + 1}. Network: ${result.network}`);
            console.log(`   Contract: ${result.isContract ? '✅' : '❌'}`);
            if (result.isContract) {
                console.log(`   Type: ${result.isProxy ? '🔀 Proxy' : '📄 Standard'}`);
                if (result.isProxy) {
                    console.log(`   Implementation: ${result.implementation}`);
                }
            }
            console.log("---");
        });

        console.log("\n=== DETAILED CONTRACT INFORMATION ===");

        if (contractResults.length > 0) {
            contractResults.forEach(result => {
                console.log(`\n📡 Network: ${result.network}`);
                console.log(`   RPC: ${result.rpc}`);
                console.log(`   Address: ${result.address}`);
                console.log(`   Type: ${result.isProxy ? 'Proxy' : 'Standard'}`);

                if (result.isProxy) {
                    console.log(`   Implementation Address: ${result.implementation}`);
                    console.log(`   Implementation Bytecode: ${result.implementationBytecode.substring(0, 50)}...`);
                }
            });

            // Return result for further use
            return contractResults;
        } else {
            console.log("❌ Contract not found in any network");
            return [];
        }

    } catch (error) {
        console.error("Error checking networks:", error);
        throw error;
    }
}

// Execute main function with error handling
run().catch(err => {
    console.error(err);
    process.exit(1);
});