# Frontend Architecture

## ERC-8004 Integration Map

Contract hooks and EIP-8004 concepts map as follows:

- Identity Registry (agent NFT + metadata URI)
  - Hook: src/hooks/contracts/useErc8004Identity.ts
  - Main methods: totalAgents, ownerOf, tokenURI, register, setAgentURI
- Reputation Registry (feedback score/tags)
  - Hook: src/hooks/contracts/useErc8004Reputation.ts
  - Main methods: getClients, readAllFeedback, getSummary, giveFeedback
- Validation Registry (validation requests/results)
  - Hook: src/hooks/contracts/useErc8004Validation.ts
  - Main methods: getAgentValidations, getValidationStatus, validationRequest, validationResponse

Address resolution is centralized in src/lib/contracts.ts and keyed by chain id using config/deployments files and optional VITE_* overrides.

## ZK-ID Pipeline

### Circuits and outputs

- Identity circuit: circuits/identity/agent_registry_membership.circom
  - Public signal length: 6
  - Verifier contract: VerifierIdentity
- Policy circuit: circuits/policy/yield_policy_enforcement.circom
  - Public signal length: 14
  - Verifier contract: VerifierPolicy

### Proof generation path

- Browser worker path (default for UI interactions)
  - Worker: src/workers/zkWorker.ts
  - Hooks: src/hooks/useZkIdProofWorker.ts, src/hooks/usePolicyProofWorker.ts
  - Utilities: src/lib/zk/zkIdProof.ts, src/lib/zk/policyProof.ts, src/lib/zk/proofUtils.ts
- Agent-service path (automation/back-end orchestration)
  - Service: agent-service/src/zk/policy-proof-service.ts

### Contract handoff

Proofs are normalized to contract calldata shape in src/lib/zk/proofUtils.ts via formatGroth16ProofForContract and toContractGroth16Proof.

Critical flows perform:

1. Worker proof generation
2. Local Groth16 verification against cached vkey
3. Contract verifier precheck (readContract verifyProof)
4. Contract write submission

## Performance and profiling

- Lightweight timing helper: src/lib/profiling.ts
- Profiled operations:
  - zk.identity.fullProve
  - zk.policy.fullProve
  - zk.identity.verifyLocal
  - zk.policy.verifyLocal
  - Proof-gated contract writes in useAgentPassport/useZKPolicyRegistry
  - Heavy reputation reads in useErc8004Reputation
- Key caching:
  - Verification keys cached in src/lib/zk/zkConfig.ts
  - Warmed at startup by warmZkArtifacts
- Known bottlenecks:
  - Initial WASM + zkey load
  - Large registry reads on trust pages without indexing backend

## Security assumptions and limits

- No raw credential values are logged from ZK input payloads.
- Untrusted strings and URLs from registry metadata are sanitized before rendering.
- Wallet connection + deployment-aware chain checks are enforced before writes.
- Off-chain agent-service responses are treated as advisory for critical actions; on-chain verifier and policy state checks gate proof-required flows.
- Trusted validator labeling is supported via VITE_TRUSTED_VALIDATORS.

## Testing strategy

- Unit tests (Vitest)
  - Proof formatting shape checks
  - ERC-8004 write-call builder contract method/address checks
  - Agent-service API endpoint/error behavior
- End-to-end test status
  - Playwright/Cypress is not configured in this workspace.
  - Current integration confidence is through hook-level and worker-level deterministic tests.

## Load benchmarking

- Script: agent-service benchmark:proofs
- Runs policy proof generation sequentially and fails if average exceeds BENCHMARK_MAX_AVG_MS.
- Environment knobs:
  - BENCHMARK_RUNS (default: 5)
  - BENCHMARK_MAX_AVG_MS (default: 5000)
