#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "$ROOT_DIR/scripts/setup-groth16.mjs" identity
node "$ROOT_DIR/scripts/setup-groth16.mjs" policy

echo "Patricon trusted setup complete for identity and policy circuits."
