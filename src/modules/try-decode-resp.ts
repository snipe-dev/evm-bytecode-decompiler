import {decodeAbiParameters, Hex} from "viem";

/**
 * Heuristically decodes contract response data when ABI is unknown
 * Used for decompiled bytecode analysis where output types are not known
 * @function decodeResp
 * @param {Hex} _data - Hex encoded response data from contract call
 * @returns {string} - Heuristically decoded result as string
 * @description
 * Based on data length and content patterns, tries to interpret:
 * - 66 chars: uint256 or address (uses heuristics to distinguish)
 * - 130 chars: two uint256 values, returns first
 * - 194 chars: string
 * - >194 chars: gives up
 * - ≤2 chars: tries to decode as error string
 */
export function decodeResp(_data: Hex): string {
    // If data is empty or just '0x'
    if (!_data || _data.length <= 2) {
        return "execution reverted";
    }

    // Data length in characters (including 0x prefix)
    const dataLength = _data.length;

    // Case 1: 66 characters = 0x + 64 hex = 32 bytes
    if (dataLength === 66) {
        try {
            // Try to decode as uint256 first
            const decoded = decodeAbiParameters(
                [{ type: "uint256" }],
                _data
            )[0];

            // Type assertion since decodeAbiParameters returns unknown[]
            const bigIntValue = BigInt(decoded as bigint);
            const intToString = bigIntValue.toString();

            // Heuristic: check if this might actually be an address
            // Original logic: if value is 57005 OR string length is between 35 and 51
            // (addresses when converted to decimal have specific length ranges)
            if (bigIntValue === 57005n ||
                (intToString.length > 35 && intToString.length < 51)) {
                // Try to decode as address instead
                try {
                    return decodeAbiParameters(
                        [{type: "address"}],
                        _data
                    )[0] as string;
                } catch {
                    // If address decoding fails, return the uint256 value
                    return intToString;
                }
            } else {
                // Not an address, return the uint256 value
                return intToString;
            }
        } catch {
            // If uint256 decoding fails, try address
            try {
                return decodeAbiParameters(
                    [{type: "address"}],
                    _data
                )[0] as string;
            } catch {
                return "execution reverted";
            }
        }
    }

    // Case 2: 130 characters = 0x + 128 hex = 64 bytes
    if (dataLength === 130) {
        try {
            // Assume it's two uint256 values, return the first
            const decoded = decodeAbiParameters(
                [{ type: "uint256" }, { type: "uint256" }],
                _data
            )[0] as bigint;
            return decoded.toString();
        } catch {
            return "execution reverted";
        }
    }

    // Case 3: 194 characters = 0x + 192 hex = 96 bytes
    if (dataLength === 194) {
        try {
            // Assume it's a string
            return decodeAbiParameters(
                [{type: "string"}],
                _data
            )[0] as string;
        } catch {
            return "execution reverted";
        }
    }

    // Case 4: Data too long to interpret reliably
    if (dataLength > 194) {
        return "could not decode the response";
    }

    // Case 5: Short data - try to decode as error string
    // This handles revert reasons with error selectors
    try {
        // Skip the first 4 bytes (function selector) if present
        // Ensure we have enough length for selector (4 bytes = 8 hex chars + 2 for 0x)
        if (_data.length <= 10) {
            return "execution reverted";
        }

        const dataWithoutSelector = `0x${_data.slice(10)}` as Hex;
        return decodeAbiParameters(
            [{type: "string"}],
            dataWithoutSelector
        )[0] as string;
    } catch {
        return "execution reverted";
    }
}