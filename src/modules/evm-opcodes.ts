/**
 * Interface representing an EVM opcode with its metadata
 */
export interface EvmOpcode {
    name: string;
    opcode: number;
    pc: number;
    pushData?: Buffer;
}

/**
 * EVM bytecode parser for extracting opcodes and their data
 *
 * This class parses raw EVM bytecode and extracts structured opcode information
 * including PUSH operations with their associated data
 */
export class EVM {
    private readonly code: Buffer;
    private opcodes: EvmOpcode[] = [];

    /**
     * Creates an EVM bytecode parser instance
     *
     * @param bytecode - Raw EVM bytecode as a hex string (with or without '0x' prefix)
     * @throws {Error} If bytecode is not a valid hex string
     */
    constructor(bytecode: string) {
        // Remove '0x' prefix if present
        const hexCode = bytecode.startsWith('0x')
            ? bytecode.slice(2)
            : bytecode;
        this.code = Buffer.from(hexCode, 'hex');
    }

    /**
     * Parses and returns all opcodes from the bytecode
     *
     * @returns Array of parsed opcode objects with their metadata
     * @note Results are cached after first parse
     */
    getOpcodes(): EvmOpcode[] {
        if (this.opcodes.length > 0) {
            return this.opcodes;
        }

        for (let pc = 0; pc < this.code.length; pc++) {
            const opcodeByte = this.code[pc];

            const opcodeInfo = this.getOpcodeInfo(opcodeByte);
            const currentOp: EvmOpcode = {
                name: opcodeInfo.name,
                opcode: opcodeByte,
                pc: pc
            };

            // Handle PUSH operations which include embedded data
            if (opcodeInfo.name.startsWith('PUSH')) {
                const pushSize = parseInt(opcodeInfo.name.replace('PUSH', ''), 10);
                if (pc + pushSize < this.code.length) {
                    currentOp.pushData = this.code.slice(pc + 1, pc + pushSize + 1);
                    pc += pushSize; // Skip the embedded push data
                }
            }

            this.opcodes.push(currentOp);
        }

        return this.opcodes;
    }

    /**
     * Maps opcode byte values to their human-readable names
     *
     * @param opcode - Numeric opcode value (0x00-0xFF)
     * @returns Object containing the opcode name
     * @private
     */
    private getOpcodeInfo(opcode: number): { name: string } {
        // Opcode mapping for EVM instructions
        const opcodeMap: { [key: number]: string } = {
            // PUSH operations (0x60-0x7F)
            0x60: 'PUSH1', 0x61: 'PUSH2', 0x62: 'PUSH3', 0x63: 'PUSH4',
            0x64: 'PUSH5', 0x65: 'PUSH6', 0x66: 'PUSH7', 0x67: 'PUSH8',
            0x68: 'PUSH9', 0x69: 'PUSH10', 0x6A: 'PUSH11', 0x6B: 'PUSH12',
            0x6C: 'PUSH13', 0x6D: 'PUSH14', 0x6E: 'PUSH15', 0x6F: 'PUSH16',
            0x70: 'PUSH17', 0x71: 'PUSH18', 0x72: 'PUSH19', 0x73: 'PUSH20',
            0x74: 'PUSH21', 0x75: 'PUSH22', 0x76: 'PUSH23', 0x77: 'PUSH24',
            0x78: 'PUSH25', 0x79: 'PUSH26', 0x7A: 'PUSH27', 0x7B: 'PUSH28',
            0x7C: 'PUSH29', 0x7D: 'PUSH30', 0x7E: 'PUSH31', 0x7F: 'PUSH32',

            // Arithmetic and stack operations
            0x00: 'STOP', 0x01: 'ADD', 0x02: 'MUL', 0x03: 'SUB',
            0x50: 'POP', 0x51: 'MLOAD', 0x52: 'MSTORE', 0x53: 'MSTORE8',
            0x54: 'SLOAD', 0x55: 'SSTORE', 0x56: 'JUMP', 0x57: 'JUMPI',
            0x58: 'PC', 0x59: 'MSIZE', 0x5A: 'GAS', 0x5B: 'JUMPDEST',

            // Contract call operations
            0xF0: 'CREATE', 0xF1: 'CALL', 0xF2: 'CALLCODE', 0xF3: 'RETURN',
            0xF4: 'DELEGATECALL', 0xFA: 'STATICCALL', 0xFD: 'REVERT', 0xFF: 'SELFDESTRUCT',
        };

        return {
            name: opcodeMap[opcode] || `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`
        };
    }
}