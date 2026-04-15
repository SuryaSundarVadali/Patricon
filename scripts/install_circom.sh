#!/usr/bin/env bash
set -euo pipefail

WORK_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "Cloning circom source..."
git clone https://github.com/iden3/circom "$WORK_DIR/circom"

cd "$WORK_DIR/circom"

echo "Building circom with cargo (release)..."
cargo build --release

echo "Installing circom binary..."
cargo install --path circom

echo "Verifying circom installation..."
circom --version
