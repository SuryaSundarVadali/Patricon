# Patricon Circuits

This package contains Patricon zero-knowledge circuits and proving tooling.
The stack uses Circom 2.x, Groth16, BN254, and Poseidon-based primitives.

## Circuit layout

- `common/`
	- `poseidon_wrappers.circom`: Reusable Poseidon arity wrappers.
	- `merkle_poseidon.circom`: Poseidon binary Merkle proof verifier.
	- `range_checks.circom`: Reusable boolean and 64-bit range checks.
- `identity/`
	- `agent_registry_membership.circom`: Agent membership proof against an authorized Merkle root.
- `policy/`
	- `yield_policy_enforcement.circom`: Rule-based yield-farming constraints with accumulator updates.

## Integration with Patricon

- Proof artifacts generated here are consumed by:
	- `contracts/` verifier contracts (`VerifierIdentity`, `VerifierPolicy`).
	- `agent-service/` proof generation bindings (`snarkjs fullProve`).
	- `dashboard/` indirectly through proof-gated activity events emitted by contracts.

## Identity circuit interface

Circuit: `identity/agent_registry_membership.circom`

Public inputs:
- `merkleRoot`: authorized identity registry root.
- `agentPublicKeyHash`: public identity hash (pubkey or DID hash).
- `policyHash`: policy fingerprint to bind identity proof usage.
- `identityNonce`: replay-protection nonce.

Private inputs:
- `merkleLeaf`: identity leaf hash.
- `merklePathElements[8]`: Merkle authentication path siblings.
- `merklePathIndices[8]`: direction bits, constrained to boolean.
- `agentSecret`: private agent secret used for commitment.

Public outputs:
- `identityCommitment`: Poseidon hash of `(agentPublicKeyHash, agentSecret)`.
- `replayNullifier`: Poseidon hash of `(agentPublicKeyHash, policyHash, identityNonce)`.

## Policy circuit interface

Circuit: `policy/yield_policy_enforcement.circom`

Public inputs:
- Policy parameters: `maxTrade`, `dailyVolumeLimit`, `minDelay`, `allowedTokenIdA`, `allowedTokenIdB`.
- Previous accumulator state: `previousCumulativeVolume`, `previousTradeTimestamp`, `previousNonce`.
- Current action context: `tokenId`, `newTradeTimestamp`, `tradeNonce`.

Private inputs:
- `tradeAmount`.

Public outputs:
- `updatedCumulativeVolume`.
- `updatedNonce`.
- `policyHash`: Poseidon commitment to active policy parameters.

Enforced constraints (first iteration):
- Max single trade size (`tradeAmount <= maxTrade`).
- Daily cumulative cap with accumulator update.
- Minimum delay between trades.
- Token whitelist membership for two approved token IDs.
- Replay protection via strictly increasing nonce.

## Scripts

- `pnpm build:identity`: Compile identity circuit into `.r1cs`, `.wasm`, and `.sym`.
- `pnpm build:policy`: Compile policy circuit into `.r1cs`, `.wasm`, and `.sym`.
- `pnpm build`: Compile both circuits.
- `pnpm setup:identity`: Run Groth16 setup for identity circuit.
- `pnpm setup:policy`: Run Groth16 setup for policy circuit.
- `pnpm setup`: Run setup for both circuits.
- `pnpm export:verifier`: Export Solidity verifier contracts for all circuits.
- `pnpm proof:sample`: Run local dummy witness generation + `groth16 fullprove` + local verify.
- `pnpm test`: Basic package integrity checks.

## Artifacts

- Build outputs are stored under `compiled/<circuit>/`.
- Solidity verifiers are written to `../contracts/contracts/verifier/`.
- Verification and proving key JSON artifacts are generated per circuit after setup.

## Local proving pipeline example

1. `pnpm build`
2. `pnpm setup`
3. `pnpm proof:sample`
4. `pnpm export:verifier`

The sample proof flow creates:
- A dummy agent identity.
- A Poseidon Merkle proof of membership.
- A policy-compliant trade witness.
- Valid Groth16 proofs for both circuits and verifies them locally.
