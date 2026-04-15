#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CIRCUITS_DIR="$ROOT_DIR/circuits"
BUILD_DIR="$CIRCUITS_DIR/build"
KEYS_DIR="$CIRCUITS_DIR/keys"
POT_0000="$KEYS_DIR/pot14_0000.ptau"
POT_0001="$KEYS_DIR/pot14_0001.ptau"
POT_FINAL="$KEYS_DIR/pot14_final.ptau"
CEREMONY_ENTROPY="${PATRICON_ZKEY_ENTROPY:-patricon-local-entropy}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --entropy=*)
      CEREMONY_ENTROPY="${1#*=}"
      shift
      ;;
    --entropy)
      CEREMONY_ENTROPY="${2:-$CEREMONY_ENTROPY}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$KEYS_DIR"

run_or_fail() {
  local scope="$1"
  shift

  if ! "$@"; then
    echo "[setup.sh] failed at scope: ${scope}" >&2
    exit 1
  fi
}

echo "Running Powers of Tau (bn128, pot14)..."
echo "pot14 supports up to 2^14 constraints (16384), which is sufficient for these small policy/KYC/jurisdiction circuits."

if [[ -f "$POT_FINAL" ]]; then
  echo "Found cached $POT_FINAL, skipping Powers of Tau generation."
else
  run_or_fail "powersoftau:new" \
    snarkjs powersoftau new bn128 14 "$POT_0000" -v

  run_or_fail "powersoftau:contribute" \
    snarkjs powersoftau contribute "$POT_0000" "$POT_0001" \
    --name="Patricon Ceremony Contribution 1" \
    --entropy="$CEREMONY_ENTROPY" \
    -v

  run_or_fail "powersoftau:prepare-phase2" \
    snarkjs powersoftau prepare phase2 "$POT_0001" "$POT_FINAL" -v
fi

setup_circuit() {
  local name="$1"
  local r1cs="$BUILD_DIR/$name/$name.r1cs"
  local zkey0="$KEYS_DIR/${name}_0000.zkey"
  local zkey1="$KEYS_DIR/${name}_0001.zkey"
  local vkey="$KEYS_DIR/${name}_verification_key.json"

  echo "Running Phase 2 for ${name}"

  run_or_fail "$name" \
    snarkjs groth16 setup "$r1cs" "$POT_FINAL" "$zkey0"

  run_or_fail "$name" \
    snarkjs zkey contribute "$zkey0" "$zkey1" \
    --name="Patricon Phase2 Contributor 1" \
    --entropy="$CEREMONY_ENTROPY" \
    -v

  run_or_fail "$name" \
    snarkjs zkey export verificationkey "$zkey1" "$vkey"

  run_or_fail "$name" \
    snarkjs zkey verify "$r1cs" "$POT_FINAL" "$zkey1"
}

setup_circuit "agent_policy"
setup_circuit "kyc_threshold"
setup_circuit "jurisdiction_check"

echo "Trusted setup complete. Keys written to $KEYS_DIR"
