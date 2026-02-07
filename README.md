<div align="center">

<img src="https://raw.githubusercontent.com/snipe-dev/evm-bytecode-decompiler/master/src/assets/logo.png" width="320" alt="EVM Bytecode Decompiler Logo" />

<br/>
<br/>
Production-grade Bytecode Decompiler Real-Time Contract Analysis
<br/>
<br/>

![Last Commit](https://img.shields.io/github/last-commit/snipe-dev/spybot?style=flat-square)
![Stars](https://img.shields.io/github/stars/snipe-dev/spybot?style=flat-square)
![Node](https://img.shields.io/badge/node-22+-blue?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue?style=flat-square&logo=typescript)
![Users](https://img.shields.io/badge/600%2B-Active%20Users-2ea44f?style=flat-square)


### Live Bots

[![ETH Bot](https://img.shields.io/badge/eth_decompiler_bot-2CA5E0?style=flat-square&logo=telegram&logoColor=white)](https://t.me/eth_decompiler_botT)

</div>

---
# EVM Bytecode Decompiler — Real-Time Contract Analysis Without ABI

## Overview

**EVM Bytecode Decompiler** is a TypeScript-based toolkit and live Telegram bot for analyzing smart contracts **without source code or ABI**.

A large portion of deployed contracts remain unverified for hours or days after deployment. During this time, understanding contract behavior, security properties, or callable methods becomes extremely difficult.

This project closes that gap by enabling **immediate bytecode-level analysis** using only on-chain data.

---

## 🔍 EVM Bytecode Decompiler Bot

The Telegram bot provides a fully automated interface for analyzing EVM smart contracts directly from their address.

Simply send a contract address (`0x...`) and receive a structured analysis.

### Core Capabilities

* **Bytecode Analysis** — Extract function selectors from raw EVM bytecode
* **Signature Resolution** — Access 2,500,000+ known function signatures database
* **Dynamic Execution** — Automatically call parameterless contract functions
* **Proxy Detection** — Identify and resolve proxy contract patterns
* **Multi-Chain Support** — ETH, BSC, AVAX, BASE, BLAST, ARBITRUM

### Ideal For

* Security researchers analyzing new deployments
* Developers integrating with unverified protocols
* Auditors performing preliminary contract reviews
* Users verifying contract functionality before interaction

---

## Key Features

* Bytecode opcode extraction (PUSH4 selectors)
* Automatic function signature resolution
* Heuristic response decoding without ABI
* Parallel execution via Multicall3 and direct calls
* Revert reason extraction and normalization
* Automatic detection of callable (no-argument) functions
* Real-time post-deployment analysis
* Proxy contract resolution
* Multi-chain EVM support
* Fully type-safe TypeScript implementation

---

## Core Components

### 1. EVM Opcode Parser (`evm-opcodes.ts`)

Lightweight bytecode parser that extracts function selectors from raw EVM bytecode by scanning PUSH4 opcodes.

Produces structured opcode and selector metadata for further analysis.

---

### 2. Multicall Wrapper (`multicall-viem.ts`)

Custom Multicall3 implementation that:

* Accepts raw calldata
* Works without ABI definitions
* Supports batch execution of unknown functions

Used for safe probing of unverified contracts.

---

### 3. Parallel Execution Layer (`groupcall-viem.ts`)

Parallel wrapper around low-level contract calls with:

* Concurrent execution
* Per-call error isolation
* Normalized revert decoding

Allows multiple unknown functions to be tested simultaneously.

---

### 4. Heuristic Response Decoder (`try-decode-resp.ts`)

Attempts to decode unknown return data using:

* ABI encoding heuristics
* Length-based inference
* Pattern recognition

Can identify:

* Addresses
* Integers
* Strings
* Error messages

Without ABI knowledge.

---

### 5. Contract Analyzer

Main orchestration layer that:

1. Fetches contract bytecode
2. Extracts function selectors
3. Resolves possible signatures
4. Detects proxy implementations
5. Executes callable functions
6. Decodes responses
7. Produces structured results

---

## Technology Stack

* **TypeScript** — Strict type safety
* **Node.js** — Runtime environment
* **Viem** — High-performance EVM interaction
* **grammY** — Telegram bot framework
* **EVM Opcodes** — Direct bytecode parsing
* **External Signature Databases** — Function resolution

---

## Summary

**EVM Bytecode Decompiler** is designed for situations where:

* Contracts are newly deployed
* Source code is unavailable
* ABI is missing
* Immediate understanding is required

It is not intended to replace verified ABI-based interaction.

It provides **early visibility** into contract behavior during the most critical post-deployment window.

---

## External Resources
* (EVM) bytecode selector extractor: [https://github.com/snipe-dev/evm-selector-extractor](https://github.com/snipe-dev/evm-selector-extractor)
* Viem documentation: [https://viem.sh](https://viem.sh)
* OpenChain signature database: [https://docs.sourcify.dev/docs/api](https://docs.sourcify.dev/docs/api)
* 4byte directory: [https://www.4byte.directory](https://www.4byte.directory)
