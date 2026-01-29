# EVM Bytecode Decompiler — Real-Time Contract Analysis Without ABI

## Overview

**EVM Bytecode Decompiler** is a TypeScript-based toolkit for extracting and analyzing EVM contract bytecode in real time, designed specifically for situations where contract ABIs are unavailable.

It enables:

- Automatic function selector extraction
- Function signature resolution
- Heuristic response decoding
- Parallel contract execution

This allows analysis of newly deployed contracts **before verification on block explorers**.

---

## Why This Toolkit Exists

When contracts are deployed on EVM-compatible chains, they often remain **unverified for hours or days**. During this period:

- Security researchers cannot analyze new contracts
- Monitoring systems cannot inspect contract behavior
- Users cannot understand contract functionality
- Developers cannot integrate with new protocols

This toolkit closes that gap by enabling **immediate bytecode-level analysis** using only:

- Contract bytecode
- On-chain execution
- External signature databases

No ABI required.

---

## Typical Use Cases

### Security Analysis
- Detection of suspicious or dangerous function patterns
- Early identification of malicious logic

### DeFi Monitoring
- Tracking newly deployed tokens and pools
- Monitoring farms and routers before verification

### Wallets & Explorers
- Basic interaction support for unverified contracts
- Display callable functions automatically

### Research & Analytics
- Studying deployment patterns
- Comparing contract evolution across chains

### Protocol Integration
- Early-stage integration before documentation exists

In these scenarios, **minutes matter**.

---

## Key Features

- Bytecode opcode extraction (PUSH4 selectors)
- Automatic function signature resolution (OpenChain + 4byte)
- Heuristic response decoding without ABI
- Parallel execution via Multicall3 and direct calls
- Revert reason extraction and normalization
- Automatic detection of callable (no-argument) functions
- Real-time post-deployment analysis
- Multi-chain support via viem
- Fully type-safe TypeScript implementation

---

## Core Components

### 1. EVM Opcode Parser (`evm-opcodes.ts`)

Lightweight bytecode parser that extracts function selectors from raw EVM bytecode by scanning PUSH4 opcodes.

Provides structured opcode and selector metadata.

---

### 2. Multicall Wrapper (`multicall-viem.ts`)

Custom Multicall3 implementation that:

- Accepts raw calldata
- Does not require ABI definitions
- Supports batch execution of unknown functions

Essential for unverified contract analysis.

---

### 3. Parallel Execution Layer (`groupcall-viem.ts`)

Parallel wrapper around `viem.client.call` with:

- Concurrent execution
- Per-call error handling
- Detailed revert reason extraction

Used to safely probe multiple functions simultaneously.

---

### 4. Heuristic Response Decoder (`try-decode-resp.ts`)

Attempts to decode unknown return data using:

- Length-based heuristics
- Pattern matching
- Known ABI encoding rules

Can identify:

- Addresses
- Numbers
- Strings
- Error messages

Without ABI knowledge.

---

### 5. Contract Analyzer (`test-decompile.ts`)

Main orchestration module that:

1. Fetches contract bytecode
2. Extracts function selectors
3. Resolves possible signatures
4. Separates callable and non-callable functions
5. Executes callable functions
6. Decodes responses
7. Produces structured analysis results

---

## Technology Stack

- **TypeScript** — Strict type safety
- **Viem** — High-performance Ethereum interaction
- **Node.js** — Runtime environment
- **EVM Opcodes** — Direct bytecode parsing
- **Fetch API** — Signature resolution

---

## Why Viem

Viem was selected because it provides:

- Superior performance compared to ethers.js
- Native TypeScript-first architecture
- Full multi-chain EVM support
- Tree-shakable modular design
- Active development and maintenance

Viem provides the execution layer — this toolkit adds **bytecode intelligence**.

---

## Architecture Philosophy

This toolkit is a **discovery and analysis layer**, not a production interaction SDK.

Assumptions:

1. Contracts are unverified
2. ABI is unavailable
3. Function signatures must be discovered
4. Return types must be inferred

Layered approach:

- Bytecode analysis — what the contract *can* do
- Signature resolution — what it *claims* to do
- Function execution — what it *actually* does
- Response decoding — what it *returns*

This enables incremental understanding of unknown contracts.

---

## Quick Start Example

```ts
import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { analyzeContract } from './evm-bytecode-decompiler';

const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-rpc.publicnode.com'),
});

const contractAddress = '0x...';

const results = await analyzeContract(client, contractAddress);

console.log(results.callableFunctions);
console.log(results.nonCallableFunctions);
```

---

## Real-World Applications

### Immediate Threat Detection

```ts
const suspiciousPatterns = ['transferFrom', 'approve', 'mint', 'burn'];

const functions = await extractFunctions(contractAddress);

const suspicious = suspiciousPatterns.some(p =>
  functions.some(fn => fn.includes(p))
);
```

---

### DeFi Protocol Integration

```ts
const farm = '0x...';

const analysis = await analyzeContract(farm);

const depositFn = analysis.functions.find(fn =>
  fn.signature?.includes('deposit')
);
```

---

### Wallet Contract Support

```ts
const userContract = '0x...';

const callable = await getCallableFunctions(userContract);

// Render UI buttons dynamically
```

---

## Limitations

- Heuristic decoding is not 100% accurate
- External signature databases may contain incorrect entries
- Executing unknown functions consumes gas
- External APIs are rate-limited
- Proxy contracts require additional resolution logic

---

## Summary

**EVM Bytecode Decompiler** is not a replacement for verified contract interaction.

It is designed for situations where:

- Contracts are newly deployed
- ABI is unavailable
- Immediate understanding is required
- Exploration outweighs perfect accuracy

If you need precise production interaction — wait for verification.

If you need insight **immediately after deployment** — this toolkit provides the necessary instruments.

---

## External Resources

- Viem documentation: https://viem.sh
- OpenChain signature database: https://docs.sourcify.dev/docs/api
- 4byte directory: https://www.4byte.directory
