import {Hex} from "viem";

/**
 * Interface representing a call for multicall
 * @interface MulticallCall
 * @property {string} target - Contract address to call
 * @property {Hex} callData - Encoded call data (calldata)
 */
export interface MulticallCall {
    target: string;
    callData: Hex;
}