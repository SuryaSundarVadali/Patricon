#!/usr/bin/env node

import path from "node:path";
import { circuitConfigs, getCircuitConfig, getCircuitPaths } from "./circuit-config.mjs";
import { ensureDir, runCommand, assertFileExists } from "./script-utils.mjs";

const requestedKey = process.argv[2] ?? "all";

const keys =
  requestedKey === "all"
    ? Object.keys(circuitConfigs)
    : [getCircuitConfig(requestedKey).key];

for (const key of keys) {
  const config = getCircuitConfig(key);
  const paths = getCircuitPaths(config);

  await assertFileExists(
    paths.zkeyFinalPath,
    `Missing final zkey for ${key}. Run setup for this circuit first.`
  );

  await ensureDir(path.dirname(paths.solidityVerifierPath));

  await runCommand("snarkjs", [
    "zkey",
    "export",
    "solidityverifier",
    paths.zkeyFinalPath,
    paths.solidityVerifierPath
  ]);

  console.log(`Exported ${key} verifier to ${paths.solidityVerifierPath}`);
}