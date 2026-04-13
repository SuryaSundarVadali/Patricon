# Patricon Agent Service

This package runs deterministic rule-based agents that generate Groth16 proofs and submit proof-gated transactions.

## Responsibilities

- Load policy and network configuration.
- Prepare witness/proof generation inputs.
- Submit transactions to HashKey Chain using configured adapters.

## Scripts

- `pnpm dev`: Start service in watch mode.
- `pnpm build`: Compile TypeScript output to `dist/`.
- `pnpm start`: Run compiled service.
- `pnpm test`: Execute unit tests.
