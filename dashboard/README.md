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

The dashboard is read-only and does not submit transactions.

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
