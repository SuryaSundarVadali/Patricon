# Patricon

Patricon is a production-grade zero-knowledge identity and policy enforcement layer for autonomous on-chain agents.
It enables deterministic agent execution only when the agent presents a valid proof that action constraints were satisfied and identity linkage requirements were met.

## Architecture

- `circuits/`: Circom 2.x circuits, trusted setup scripts, and Groth16 proof tooling on BN254.
- `contracts/`: Solidity policy registry, verifier integration, and adapter contracts for DeFi and settlement flows.
- `agent-service/`: TypeScript rule-based agent service that generates proofs and submits transactions to HashKey Chain.
- `dashboard/`: React + TypeScript dashboard for observing agents, policies, proofs, and transaction status.
- `config/`: Shared configuration templates for network and service settings.

## Quick Start

1. Install dependencies:
   - `pnpm install`
2. Run tests:
   - `pnpm test`
3. Start local development services:
   - `pnpm dev:agent`
   - `pnpm dev:dashboard`

## Security and Compliance

Patricon is designed for policy-constrained automation. Proof generation and verification workflows are intended to be auditable, deterministic, and privacy-preserving.
