# Patricon Dashboard

This package provides a professional monitoring interface for Patricon agents, policies, and proof-gated activity.

## Responsibilities

- Present a system overview and active network configuration.
- Display registered agents, policy bindings, and last observed actions.
- Display policy configurations and hashes from PolicyRegistry events.
- Display recent proof-gated transactions with status, gas usage, and timestamps.

## Integration with Patricon

- Reads deployment addresses from `../config/deployments/<network>.json`.
- Reads network metadata from `../config/networks.json`.
- Uses `ethers` JSON-RPC reads to query contracts and events:
	- AgentRegistry
	- PolicyRegistry
	- PolicyEnforcedDeFiAdapter

- Uses `wagmi` + `viem` for non-custodial wallet connection and signing for dashboard-triggered actions.
- Supports both EOAs and ERC-4337 compatible smart accounts (for example Safe-based accounts).

The dashboard can submit operator actions only through a connected wallet signer.
It never stores or requests raw private keys.

## Scripts

- `pnpm dev`: Start local dashboard development server.
- `pnpm build`: Build production assets.
- `pnpm test`: Run dashboard tests.
- `pnpm lint`: Type-check dashboard code.

## Pages

- `Overview`: architecture summary, diagram, and network/deployment details.
- `Agents`: registered agents, type hash, linked policy hash, and last action.
- `Policies`: policy hash, versioning, and status.
- `Activity / Proofs`: recent proof-gated execution events and transaction metadata.

## Wallet model

- Connection options include MetaMask, Rabby/Phantom EVM via injected providers, WalletConnect-compatible wallets, and Safe smart accounts where available.
- All writes initiated from the UI are signed by the connected wallet.
- Private-key based signing is out of scope for production usage.

## Architecture docs

- Frontend architecture and hardening notes: `docs/frontend-architecture.md`
