import {config} from "../config/config.js";
import {createPublicClient, http} from 'viem';
import { EVM } from "evm-selector-extractor";
import {detectProxyImplementation} from "../modules/proxy-implementation.js";

/**
 * Blockchain client for interacting with BSC
 */
const client = createPublicClient({
    transport: http(config.networks.BSC.rpc),
});

/**
 * Ethereum (BSC) contract address for which to analyze bytecode and extract function signatures
 */
const CONTRACT_ADDRESS: `0x${string}` = "0x5c952063c7fc8610FFDB798152D69F0B9550762b";

/**
 * Main function
 */
async function run() {
    // Validate configuration
    if (!CONTRACT_ADDRESS) {
        console.error('Contract address is not configured');
        return;
    }

    const proxy = await detectProxyImplementation(
        client,
        CONTRACT_ADDRESS
    )

    if (proxy && proxy.isProxy){
        console.log('proxy:', proxy.proxy)
        console.log('implementation:', proxy.implementation)
        const evm = new EVM(proxy.implementationBytecode);
        console.log('implementation selectors:',evm.getSelectors())
    }else {
        console.log('address:', CONTRACT_ADDRESS, 'not proxy contract')
    }
}

// Execute main function with error handling
run().catch(err => {
    console.error(err);
    process.exit(1);
});
