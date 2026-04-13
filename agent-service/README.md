# Patricon Agent Service

This package runs deterministic rule-based agents that generate Groth16 proofs and submit proof-gated transactions.

## Architecture

- `src/config/`: runtime configuration and env parsing.
- `src/clients/`: HashKey chain client and pool state data clients.
- `src/zk/`: witness builders and `snarkjs` proof generation bindings.
- `src/strategies/`: deterministic yield-farming strategy rules.
- `src/agents/`: Patricon agent orchestration logic.
- `src/settlement/`: settlement action construction and SettlementConnector submission.
- `src/logging/`: structured JSON logging.

## Responsibilities

- Observe DeFi pool state.
- Evaluate deterministic strategy decisions.
- Build policy and identity witnesses.
- Generate Groth16 proofs from compiled Circom artifacts.
- Submit `depositWithProof`, `withdrawWithProof`, or `rebalanceWithProof` transactions.
- Execute settlement payments through `SettlementConnector.executeSettlementWithProof` using policy proofs.
- Support dry-run mode for safe debugging.

## Integration with Patricon

- Loads circuit artifacts produced by `circuits/`.
- Submits proof-gated calls to contracts deployed from `contracts/`.
- Produces execution logs and on-chain events visualized in `dashboard/`.

## Scripts

- `pnpm dev`: Start service in watch mode.
- `pnpm start:agent`: Run the agent in normal mode with live submission.
- `pnpm start:simulated`: Run in deterministic simulation mode with dry run enabled.
- `pnpm demo:settlement`: Run demo flow (deposit -> simulated yield -> policy-proven settlement).
- `pnpm build`: Compile TypeScript output to `dist/`.
- `pnpm start`: Run compiled service.
- `pnpm test`: Execute unit tests.

## Required Environment Variables

- Chain and credentials:
	- `HASHKEY_TESTNET_RPC_URL`
	- `HASHKEY_TESTNET_CHAIN_ID`
	- `PRIVATE_KEY`
- Contract addresses:
	- `DEFI_ADAPTER_ADDRESS`
	- `POLICY_REGISTRY_ADDRESS`
	- `AGENT_REGISTRY_ADDRESS`
	- `IDENTITY_VERIFIER_ADDRESS`
	- `POLICY_VERIFIER_ADDRESS`
	- `SETTLEMENT_CONNECTOR_ADDRESS`
- Strategy and policy parameters:
	- `APY_DEPOSIT_THRESHOLD_BPS`
	- `APY_WITHDRAW_THRESHOLD_BPS`
	- `MAX_ALLOCATION_BPS`
	- `MAX_EXPOSURE`
	- `DEFAULT_TRADE_AMOUNT`
	- `WHITELISTED_TOKEN_IDS`
	- `POLICY_MAX_TRADE`
	- `POLICY_DAILY_VOLUME_LIMIT`
	- `POLICY_MIN_DELAY_SECONDS`
- Circuit artifacts:
	- `IDENTITY_WASM_PATH`
	- `IDENTITY_ZKEY_PATH`
	- `IDENTITY_VKEY_PATH`
	- `POLICY_WASM_PATH`
	- `POLICY_ZKEY_PATH`
	- `POLICY_VKEY_PATH`

## Dry Run

Set either:
- `PATRICON_DRY_RUN=true`, or
- `AGENT_MODE=simulated`

In dry run mode, the service executes strategy and proof generation but skips on-chain transaction submission.

## Settlement flow

The settlement extension uses policy proofs to gate payment events:

1. A settlement action is derived from realized yield and configured settlement share.
2. The service builds a policy witness and generates a Groth16 proof.
3. The proof is locally verified for observability.
4. `SettlementConnector.executeSettlementWithProof` is called with payment parameters and proof payload.

This keeps DeFi execution and PayFi-style settlement on a shared policy framework.
