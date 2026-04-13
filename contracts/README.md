# Patricon Contracts

This package contains Solidity contracts for Patricon policy enforcement and proof-gated execution.

## Stack

- Solidity `0.8.24`
- Foundry (`forge`) for build/test/deploy
- Groth16 verifier contracts generated via `snarkjs`

## Structure

- `contracts/identity/`
	- `AgentRegistry.sol`: Registers agent identity bindings and identity Merkle root.
- `contracts/policy/`
	- `PolicyRegistry.sol`: Maps agent address to policy hash, policy version, and circuit version.
- `contracts/verifier/`
	- `PatriconIdentityVerifier.sol` (`VerifierIdentity`): identity circuit verifier.
	- `PatriconPolicyVerifier.sol` (`VerifierPolicy`): policy circuit verifier.
	- `IVerifierIdentity.sol`, `IVerifierPolicy.sol`: fixed public-signal interfaces.
- `contracts/adapters/`
	- `PolicyEnforcedDeFiAdapter.sol`: `depositWithProof`, `withdrawWithProof`, `rebalanceWithProof`.
	- `SettlementConnector.sol`: proof-gated settlement event connector.
	- `MockYieldPool.sol`: simple pool for test and fallback testnet deployment.

## Scripts

- `pnpm compile`: Compile all contracts.
- `pnpm test`: Run contract tests.
- `pnpm deploy:testnet`: Deploy verifier + registry + adapter contracts to HashKey Chain testnet.

## Public input mapping

Identity circuit public signals expected by contracts:
- `[0]=identityCommitment`
- `[1]=replayNullifier`
- `[2]=merkleRoot`
- `[3]=agentPublicKeyHash`
- `[4]=policyHash`
- `[5]=identityNonce`

Policy circuit public signals expected by contracts:
- `[0]=updatedCumulativeVolume`
- `[1]=updatedNonce`
- `[2]=policyHash`
- `[3]=maxTrade`
- `[4]=dailyVolumeLimit`
- `[5]=minDelay`
- `[6]=allowedTokenIdA`
- `[7]=allowedTokenIdB`
- `[8]=previousCumulativeVolume`
- `[9]=previousTradeTimestamp`
- `[10]=previousNonce`
- `[11]=tokenId`
- `[12]=newTradeTimestamp`
- `[13]=tradeNonce`

This mapping is kept explicit to maintain stable verifier wiring with on-chain policy checks.

## Deployment output

Deployments are written to:
- `../config/deployments/<network>.json`

The file includes deployed addresses for:
- `identityVerifier`
- `policyVerifier`
- `policyRegistry`
- `agentRegistry`
- `targetPool`
- `policyEnforcedDeFiAdapter`
- `settlementConnector`
