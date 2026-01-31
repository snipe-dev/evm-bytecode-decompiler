import { PublicClient, Hex, Address, getAddress } from "viem";

/**
 * EIP-1967 implementation storage slot.
 *
 * bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
 */
const IMPLEMENTATION_SLOT =
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

/**
 * EIP-1967 beacon storage slot.
 *
 * bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1)
 */
const BEACON_SLOT =
    "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

/**
 * Function selector for:
 * implementation()
 *
 * keccak256("implementation()")[0:4]
 */
const BEACON_IMPLEMENTATION_SELECTOR = "0x5c60da1b";

/**
 * Extracts an Ethereum address from a 32-byte storage slot value.
 *
 * The address is expected to be stored right-aligned
 * according to the EVM storage layout.
 *
 * @param value Raw storage slot value
 * @returns Checksummed address or null if slot is empty or invalid
 */
function slotToAddress(value?: Hex): Address | null {
    if (!value || value === "0x") {
        return null;
    }

    const addr = ("0x" + value.slice(-40)) as Address;

    if (addr === "0x0000000000000000000000000000000000000000") {
        return null;
    }

    return getAddress(addr);
}

/**
 * Detects whether a contract address is an EIP-1967 proxy and resolves
 * its implementation contract.
 *
 * Supported proxy types:
 * - Transparent Proxy
 * - UUPS Proxy
 * - Beacon Proxy
 *
 * Resolution flow:
 * 1. Read implementation slot (EIP-1967)
 * 2. Validate implementation bytecode via getCode
 * 3. If empty, resolve beacon slot
 * 4. Call beacon.implementation()
 * 5. Validate final implementation bytecode
 *
 * @param client Viem public client instance
 * @param address Proxy contract address
 *
 * @returns Object containing:
 * - isProxy: Indicates whether a valid proxy implementation was found
 * - implementation: Resolved implementation address or zero address
 * - implementationBytecode: Runtime bytecode of the implementation contract
 */
export async function detectProxyImplementation(
    client: PublicClient,
    address: Address
): Promise<{
    isProxy: boolean;
    proxy : Address,
    implementation: Address;
    implementationBytecode: string;
}> {
    const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;

    const emptyResult = {
        isProxy: false,
        proxy : address,
        implementation: zeroAddress,
        implementationBytecode: "0x",
    };

    const implementationSlot = await client.getStorageAt({
        address,
        slot: IMPLEMENTATION_SLOT,
    });

    const implementation = slotToAddress(implementationSlot);

    if (implementation) {
        const code = await client.getCode({
            address: implementation,
        });

        if (code && code !== "0x") {
            return {
                isProxy: true,
                proxy : address,
                implementation,
                implementationBytecode: code,
            };
        }
    }

    const beaconSlot = await client.getStorageAt({
        address,
        slot: BEACON_SLOT,
    });

    const beaconAddress = slotToAddress(beaconSlot);

    if (!beaconAddress) {
        return emptyResult;
    }

    const beaconCall = await client.call({
        to: beaconAddress,
        data: BEACON_IMPLEMENTATION_SELECTOR,
    });

    if (!beaconCall.data || beaconCall.data === "0x") {
        return emptyResult;
    }

    const beaconImplementation = slotToAddress(beaconCall.data as Hex);

    if (!beaconImplementation) {
        return emptyResult;
    }

    const beaconImplCode = await client.getCode({
        address: beaconImplementation,
    });

    if (!beaconImplCode || beaconImplCode === "0x") {
        return emptyResult;
    }

    return {
        isProxy: true,
        proxy : address,
        implementation: beaconImplementation,
        implementationBytecode: beaconImplCode,
    };
}
