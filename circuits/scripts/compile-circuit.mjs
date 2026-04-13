#!/usr/bin/env node

import path from "node:path";
import { getCircuitConfig, getCircuitPaths, packageRoot } from "./circuit-config.mjs";
import { ensureDir, runCommand, assertFileExists } from "./script-utils.mjs";

const circuitKey = process.argv[2];

if (!circuitKey) {
  console.error("Usage: node ./scripts/compile-circuit.mjs <identity|policy>");
  process.exit(1);
}

const config = getCircuitConfig(circuitKey);
const paths = getCircuitPaths(config);

await ensureDir(paths.artifactDir);

await runCommand("circom", [
  paths.sourcePath,
  "--r1cs",
  "--wasm",
  "--sym",
  "-l",
  path.join(packageRoot, "node_modules"),
  "-o",
  paths.artifactDir
]);

await assertFileExists(paths.r1csPath, `R1CS output missing for ${circuitKey}: ${paths.r1csPath}`);
await assertFileExists(paths.wasmPath, `WASM output missing for ${circuitKey}: ${paths.wasmPath}`);
await assertFileExists(paths.symPath, `SYM output missing for ${circuitKey}: ${paths.symPath}`);

console.log(`Compiled '${circuitKey}' circuit:`);
console.log(`- R1CS: ${paths.r1csPath}`);
console.log(`- WASM: ${paths.wasmPath}`);
console.log(`- SYM:  ${paths.symPath}`);