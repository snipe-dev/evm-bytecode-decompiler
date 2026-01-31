/**
 * Fetches function signature from OpenChain API
 * @param selector - Function selector (e.g., '0xa9059cbb')
 * @returns Function name or original selector if not found
 */
export async function openchain(selector: string): Promise<string> {
    try {
        const response = await fetch(
            `https://api.4byte.sourcify.dev/signature-database/v1/lookup?function=${selector}&filter=true`
        );
        const data = await response.json();
        if (data.result.function[selector]) {
            return data.result.function[selector][0].name;
        }
    } catch (error) {
        // Silently fail and return selector
    }
    return selector;
}

/**
 * Fetches function signature from 4byte directory API
 * @param selector - Function selector (e.g., '0xa9059cbb')
 * @returns Function signature or original selector if not found
 */
export async function fourByte(selector: string): Promise<string> {
    try {
        const response = await fetch(
            `https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return data.results[0]['text_signature'];
        }
    } catch (error) {
        // Silently fail and return selector
    }
    return selector;
}