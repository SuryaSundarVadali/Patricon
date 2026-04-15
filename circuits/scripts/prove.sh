#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CIRCUITS_DIR="$ROOT_DIR/circuits"
BUILD_DIR="$CIRCUITS_DIR/build"
KEYS_DIR="$CIRCUITS_DIR/keys"
INPUT_DIR="$CIRCUITS_DIR/inputs"

prove_circuit() {
  local name="$1"
  local circuit_build_dir="$BUILD_DIR/$name"

  echo "Generating witness for ${name}"
  node "$circuit_build_dir/${name}_js/generate_witness.js" \
    "$circuit_build_dir/${name}_js/${name}.wasm" \
    "$INPUT_DIR/${name}_input.json" \
    "$circuit_build_dir/witness.wtns"

  echo "Generating Groth16 proof for ${name}"
  snarkjs groth16 prove \
    "$KEYS_DIR/${name}_0001.zkey" \
    "$circuit_build_dir/witness.wtns" \
    "$circuit_build_dir/proof.json" \
    "$circuit_build_dir/public.json"

  if snarkjs groth16 verify \
    "$KEYS_DIR/${name}_verification_key.json" \
    "$circuit_build_dir/public.json" \
    "$circuit_build_dir/proof.json"; then
    echo "✓ PROOF VALID: ${name}"
  else
    echo "✗ PROOF INVALID: ${name}"
  fi

  echo
}

prove_circuit "agent_policy"
prove_circuit "kyc_threshold"
prove_circuit "jurisdiction_check"

echo "Proof generation complete."
