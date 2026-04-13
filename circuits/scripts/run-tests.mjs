import { access } from "node:fs/promises";

const requiredArtifacts = [
  "identity/agent_registry_membership.circom",
  "policy/yield_policy_enforcement.circom",
  "common/merkle_poseidon.circom",
  "common/poseidon_wrappers.circom",
  "common/range_checks.circom",
  "scripts/compile-circuit.mjs",
  "scripts/setup-groth16.mjs",
  "scripts/export-verifier.mjs",
  "scripts/fullprove-sample.mjs"
];

for (const file of requiredArtifacts) {
  await access(new URL(`../${file}`, import.meta.url));
}

console.log("Patricon circuits package integrity checks passed.");
