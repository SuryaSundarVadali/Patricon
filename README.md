# Patricon

Patricon is a zero-knowledge identity and policy layer for autonomous agents on HashKey Chain.
It enforces that agent actions are executed only when policy and identity proofs are valid.

## Architecture

```text
                  +-------------------------------+
                  |            circuits/          |
                  | Identity + policy Circom zk   |
                  +---------------+---------------+
                                  |
                                  v
                  +-------------------------------+
                  |            contracts/         |
                  | Verifiers, registries,        |
                  | DeFi adapter, settlement gate |
                  +---------------+---------------+
                                  ^
                                  |
                  +---------------+---------------+
                  |         agent-service/        |
                  | Rule-based decisions, witness |
                  | build, proof gen, tx submit   |
                  +---------------+---------------+
                                  |
                                  v
                  +-------------------------------+
                  |           dashboard/          |
                  | Read-only observability for   |
                  | agents, policies, proofs      |
                  +-------------------------------+
```

Project packages:

- `circuits/`: Circom 2.x circuits, setup flow, proving and verifier export.
- `contracts/`: Solidity verification and enforcement layer.
- `agent-service/`: TypeScript automation and proof submission runtime.
- `dashboard/`: React dashboard for state and event visibility.
- `config/`: shared network and deployment configuration files.

## Quick Start

1. Install dependencies (workspace root):
   - `pnpm install`

2. Build circuits and run trusted setup:
   - `cd circuits`
   - `pnpm build`
   - `pnpm setup`
   - `pnpm export:verifier`

3. Compile and test contracts:
   - `cd contracts`
   - `pnpm compile`
   - `pnpm test`

4. Deploy contracts to test network (HashKey Chain):
   - `cd contracts`
   - connect and broadcast with your own wallet tooling in your local environment
   - set `HASHKEY_TESTNET_RPC_URL`
   - `pnpm deploy:testnet`
   - confirm `config/deployments/hashkeyTestnet.json` is updated

5. Run agent service:
   - Dry run / simulation:
     - `cd agent-service`
     - `pnpm start:simulated`
   - Live mode:
     - `cd agent-service`
       - configure contract addresses and wallet session endpoints in `.env`
     - `pnpm start:agent`

6. Run dashboard:
   - `cd dashboard`
   - `pnpm dev`

## Security and Compliance

Patricon is designed for identity-bound, policy-constrained automation.
Proof generation and verification workflows are deterministic, auditable, and privacy-preserving.

Patricon production operation is non-custodial by design:
- private keys are not stored in application configuration,
- transaction signing is performed by connected wallets,
- both EOAs and ERC-4337 smart accounts are supported in operator flows.
