#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KEYS_DIR="$ROOT_DIR/circuits/keys"
CONTRACTS_OUT_REQUESTED="$ROOT_DIR/contracts/verifiers"
CONTRACTS_OUT_FOUNDRY="$ROOT_DIR/contracts/contracts/verifier"

mkdir -p "$CONTRACTS_OUT_REQUESTED" "$CONTRACTS_OUT_FOUNDRY"

snarkjs zkey export solidityverifier \
  "$KEYS_DIR/agent_policy_0001.zkey" \
  "$CONTRACTS_OUT_REQUESTED/AgentPolicyVerifier.sol"

snarkjs zkey export solidityverifier \
  "$KEYS_DIR/kyc_threshold_0001.zkey" \
  "$CONTRACTS_OUT_REQUESTED/KYCTierVerifier.sol"

snarkjs zkey export solidityverifier \
  "$KEYS_DIR/jurisdiction_check_0001.zkey" \
  "$CONTRACTS_OUT_REQUESTED/JurisdictionVerifier.sol"

cp "$CONTRACTS_OUT_REQUESTED/AgentPolicyVerifier.sol" "$CONTRACTS_OUT_FOUNDRY/AgentPolicyVerifier.sol"
cp "$CONTRACTS_OUT_REQUESTED/KYCTierVerifier.sol" "$CONTRACTS_OUT_FOUNDRY/KYCTierVerifier.sol"
cp "$CONTRACTS_OUT_REQUESTED/JurisdictionVerifier.sol" "$CONTRACTS_OUT_FOUNDRY/JurisdictionVerifier.sol"

echo "Solidity verifiers exported to $CONTRACTS_OUT_REQUESTED and mirrored to $CONTRACTS_OUT_FOUNDRY"
