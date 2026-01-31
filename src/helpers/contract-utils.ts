/**
 * Checks if a function signature is callable (has no arguments)
 * @param signature - Function signature string
 * @returns True if function has no arguments
 */
export function isCallableSignature(signature: string | undefined): boolean {
    if (!signature) return true; // Unknown signature - try to call it
    return signature.endsWith('()');
}

/**
 * Extracts function name from signature (removes arguments)
 * @param signature - Function signature string
 * @returns Function name without arguments
 */
export function extractFunctionName(signature: string): string {
    if (signature.includes('(')) {
        return signature.split('(')[0];
    }
    return signature;
}