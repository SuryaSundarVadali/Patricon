#!/usr/bin/env bash
set -euo pipefail

NETWORK="${1:-hashkeyTestnet}"
RPC_URL="${HASHKEY_TESTNET_RPC_URL:-https://rpc.testnet.hashkey.cloud}"
CHAIN_ID="${HASHKEY_TESTNET_CHAIN_ID:-133}"
PRIVATE_KEY="${PRIVATE_KEY:-}"
TARGET_POOL="${TARGET_POOL_ADDRESS:-}"

if [[ -z "$PRIVATE_KEY" ]]; then
  echo "PRIVATE_KEY is required for deployment"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="$ROOT_DIR/../config/deployments"
OUTPUT_JSON="$CONFIG_DIR/${NETWORK}.json"

mkdir -p "$CONFIG_DIR"

parse_deployed_to() {
  node -e 'let raw="";process.stdin.on("data",d=>raw+=d);process.stdin.on("end",()=>{const parsed=JSON.parse(raw);process.stdout.write(parsed.deployedTo);});'
}

deploy_contract() {
  local contract_ref="$1"
  shift
  forge create "$contract_ref" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --json \
    "$@" | parse_deployed_to
}

echo "Deploying Patricon verifier contracts on ${NETWORK} (${CHAIN_ID})"
IDENTITY_VERIFIER=$(deploy_contract "contracts/verifier/PatriconIdentityVerifier.sol:VerifierIdentity")
POLICY_VERIFIER=$(deploy_contract "contracts/verifier/PatriconPolicyVerifier.sol:VerifierPolicy")

echo "Deploying Patricon registries"
POLICY_REGISTRY=$(deploy_contract "contracts/policy/PolicyRegistry.sol:PolicyRegistry")
AGENT_REGISTRY=$(deploy_contract "contracts/identity/AgentRegistry.sol:AgentRegistry")

if [[ -n "$TARGET_POOL" ]]; then
  echo "Using externally configured target pool: $TARGET_POOL"
  TARGET_POOL_DEPLOYED="$TARGET_POOL"
else
  echo "Deploying Patricon mock yield pool"
  TARGET_POOL_DEPLOYED=$(deploy_contract "contracts/adapters/MockYieldPool.sol:MockYieldPool")
fi

echo "Deploying Patricon adapters"
DEFI_ADAPTER=$(deploy_contract "contracts/adapters/PolicyEnforcedDeFiAdapter.sol:PolicyEnforcedDeFiAdapter" --constructor-args "$TARGET_POOL_DEPLOYED" "$POLICY_REGISTRY" "$AGENT_REGISTRY" "$IDENTITY_VERIFIER" "$POLICY_VERIFIER")
SETTLEMENT_CONNECTOR=$(deploy_contract "contracts/adapters/SettlementConnector.sol:SettlementConnector" --constructor-args "$POLICY_REGISTRY" "$POLICY_VERIFIER")

cat > "$OUTPUT_JSON" <<JSON
{
  "network": "${NETWORK}",
  "chainId": ${CHAIN_ID},
  "identityVerifier": "${IDENTITY_VERIFIER}",
  "policyVerifier": "${POLICY_VERIFIER}",
  "policyRegistry": "${POLICY_REGISTRY}",
  "agentRegistry": "${AGENT_REGISTRY}",
  "targetPool": "${TARGET_POOL_DEPLOYED}",
  "policyEnforcedDeFiAdapter": "${DEFI_ADAPTER}",
  "settlementConnector": "${SETTLEMENT_CONNECTOR}"
}
JSON

echo "Deployment completed. Addresses written to ${OUTPUT_JSON}"