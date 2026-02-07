import {Address, getAddress, isAddress} from "viem";

/**
 * Validates an EVM address
 * @param text - Input string to validate
 * @returns Validated checksum address or null if invalid
 */
export function validateEVMAddress(text: string): Address | null {
    try {
        // Check if text is an address (non-strict mode for case-insensitive)
        if (!isAddress(text, { strict: false })) {
            return null;
        }

        // Return checksum address
        return getAddress(text);
    } catch {
        return null;
    }
}