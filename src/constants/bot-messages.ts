// Define START and HELP messages
export const START_HELP_CAPTION = `<b>🔍 EVM Bytecode Decompiler</b>

Analyze smart contracts <b>without source code or ABI</b>. 
Many deployed contracts remain unverified for extended periods, making security audits and integration challenging.

<b>Core Capabilities:</b>
• <b>Bytecode Analysis</b> - Extract function selectors from raw EVM bytecode
• <b>Signature Resolution</b> - Access 2,500,000+ function signatures database
• <b>Dynamic Execution</b> - Automatically call parameterless functions
• <b>Proxy Detection</b> - Identify and resolve proxy contract patterns
• <b>Multi-Chain Support</b> - ETH, BSC, AVAX, BASE, BLAST, ARBITRUM

<b>Ideal For:</b>
• Security researchers analyzing new deployments
• Developers integrating with unverified protocols
• Auditors performing preliminary contract reviews
• Users verifying contract functionality before interaction

Send any contract address to begin immediate analysis.`;

export const START_HELP_BUTTONS = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '🗣 Order an individual bot @snipe_dev', url: 'https://t.me/snipe_dev' }],
            [{ text: '♾ News and product @scan_tools', url: 'https://t.me/scan_tools' }]
        ]
    }
};