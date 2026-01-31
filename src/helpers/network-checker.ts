import { createPublicClient, http, Address } from "viem";
import { detectProxyImplementation } from "../modules/proxy-implementation.js";

const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;

/**
 * Checks contract availability and type in a network
 * @param rpc - RPC endpoint URL
 * @param address - Contract address to check
 * @returns Contract information including type and implementation
 */
export async function checkContractInNetwork(
    rpc: string,
    address: Address
): Promise<{
    isContract: boolean;
    isProxy: boolean;
    implementation: Address;
    implementationBytecode: string;
}> {
    const client = createPublicClient({
        transport: http(rpc),
    });

    // Get contract bytecode
    const bytecode = await client.getCode({ address });

    // If bytecode is empty - this is not a contract
    if (!bytecode || bytecode === "0x") {
        return {
            isContract: false,
            isProxy: false,
            implementation: zeroAddress,
            implementationBytecode: "0x",
        };
    }

    // Check if contract is a proxy
    const proxyInfo = await detectProxyImplementation(client, address);

    return {
        isContract: true,
        isProxy: proxyInfo.isProxy,
        implementation: proxyInfo.isProxy ? proxyInfo.implementation : zeroAddress,
        implementationBytecode: proxyInfo.isProxy ? proxyInfo.implementationBytecode : "0x",
    };
}