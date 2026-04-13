#!/usr/bin/env node

import { stat, rm } from "node:fs/promises";
import { ensureDir, runCommand, assertFileExists } from "./script-utils.mjs";
import { compiledRoot, getCircuitConfig, getCircuitPaths } from "./circuit-config.mjs";

const PTAU_URLS = [
  "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau",
  "https://github.com/iden3/snarkjs/raw/master/build/powersOfTau28_hez_final_15.ptau"
];
const PTAU_PATH = `${compiledRoot}/powersOfTau28_hez_final_15.ptau`;

const circuitKey = process.argv[2];

if (!circuitKey) {
  console.error("Usage: node ./scripts/setup-groth16.mjs <identity|policy>");
  process.exit(1);
}

const config = getCircuitConfig(circuitKey);
const paths = getCircuitPaths(config);

await assertFileExists(
  paths.r1csPath,
  `Missing R1CS for ${circuitKey}. Run the build script first.`
);

await ensureDir(compiledRoot);

let ptauReady = false;
try {
  await assertFileExists(PTAU_PATH);
  const info = await stat(PTAU_PATH);
  // Valid file is several megabytes. Tiny files are usually XML/HTML error pages.
  ptauReady = info.size > 1_000_000;
  if (!ptauReady) {
    await rm(PTAU_PATH, { force: true });
  }
} catch {
  ptauReady = false;
}

if (!ptauReady) {
  let downloaded = false;
  for (const url of PTAU_URLS) {
    try {
      console.log(`Downloading BN254 Powers of Tau: ${url}`);
      await runCommand("curl", ["-fL", url, "-o", PTAU_PATH]);
      const info = await stat(PTAU_PATH);
      if (info.size > 1_000_000) {
        downloaded = true;
        break;
      }
      await rm(PTAU_PATH, { force: true });
    } catch {
      await rm(PTAU_PATH, { force: true });
    }
  }

  if (!downloaded) {
    throw new Error("Failed to download a valid BN254 ptau file from known sources.");
  }
}

const entropy = process.env.PATRICON_ZKEY_ENTROPY ?? `${config.key}-patricon-initial-entropy`;

await rm(paths.zkey0Path, { force: true });
await rm(paths.zkeyFinalPath, { force: true });

await runCommand("snarkjs", ["groth16", "setup", paths.r1csPath, PTAU_PATH, paths.zkey0Path]);

await runCommand("snarkjs", ["zkey", "verify", paths.r1csPath, PTAU_PATH, paths.zkey0Path]);

await runCommand("snarkjs", [
  "zkey",
  "contribute",
  paths.zkey0Path,
  paths.zkeyFinalPath,
  `--name=Patricon ${config.key} initial contribution`,
  "-v",
  `-e=${entropy}`
]);

await runCommand("snarkjs", [
  "zkey",
  "export",
  "verificationkey",
  paths.zkeyFinalPath,
  paths.verificationKeyPath
]);

await runCommand("snarkjs", ["zkey", "export", "json", paths.zkeyFinalPath, paths.provingKeyPath]);

console.log(`Groth16 setup completed for '${circuitKey}':`);
console.log(`- Final zkey:       ${paths.zkeyFinalPath}`);
console.log(`- Verification key: ${paths.verificationKeyPath}`);
console.log(`- Proving key JSON: ${paths.provingKeyPath}`);