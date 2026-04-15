#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CIRCUITS_DIR="$ROOT_DIR/circuits"
BUILD_DIR="$CIRCUITS_DIR/build"

mkdir -p "$BUILD_DIR"

compile_circuit() {
  local name="$1"
  local out_dir="$BUILD_DIR/$name"

  mkdir -p "$out_dir"

  echo "Compiling ${name}.circom"
  circom "$CIRCUITS_DIR/src/${name}.circom" \
    --r1cs --wasm --sym --O2 \
    -l "$CIRCUITS_DIR/node_modules" \
    -o "$out_dir"

  echo "Constraint info for ${name}:"
  snarkjs r1cs info "$out_dir/${name}.r1cs"
  echo
}

compile_circuit "agent_policy"
compile_circuit "kyc_threshold"
compile_circuit "jurisdiction_check"

echo "Compilation complete. Artifacts written to $BUILD_DIR"
