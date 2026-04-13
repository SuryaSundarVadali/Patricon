#!/usr/bin/env node

import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import { getCircuitConfig, getCircuitPaths } from "./circuit-config.mjs";
import { assertFileExists } from "./script-utils.mjs";

const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function toField(value) {
  const normalized = BigInt(value) % FIELD_MODULUS;
  return normalized >= 0n ? normalized : normalized + FIELD_MODULUS;
}

function hashTextToField(text) {
  const digest = crypto.createHash("sha256").update(text).digest("hex");
  return toField(BigInt(`0x${digest}`));
}

function poseidonToBigInt(poseidon, inputs) {
  const out = poseidon(inputs.map((x) => toField(x)));
  return BigInt(poseidon.F.toString(out));
}

function createMerkleArtifacts({ poseidon, depth, leaf, leafIndex }) {
  const totalLeaves = 1 << depth;
  const leaves = new Array(totalLeaves).fill(0n);
  leaves[leafIndex] = leaf;

  const levels = [leaves];
  for (let d = 0; d < depth; d++) {
    const current = levels[d];
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(poseidonToBigInt(poseidon, [current[i], current[i + 1]]));
    }
    levels.push(next);
  }

  const merklePathElements = [];
  const merklePathIndices = [];
  let cursor = leafIndex;
  for (let d = 0; d < depth; d++) {
    const sibling = cursor ^ 1;
    merklePathElements.push(levels[d][sibling]);
    merklePathIndices.push(cursor & 1);
    cursor = Math.floor(cursor / 2);
  }

  return {
    merkleRoot: levels[depth][0],
    merklePathElements,
    merklePathIndices
  };
}

function stringifySignals(inputObj) {
  const asString = {};
  for (const [key, value] of Object.entries(inputObj)) {
    if (Array.isArray(value)) {
      asString[key] = value.map((v) => BigInt(v).toString());
    } else {
      asString[key] = BigInt(value).toString();
    }
  }
  return asString;
}

async function proveAndVerify(circuitKey, witnessInput) {
  const config = getCircuitConfig(circuitKey);
  const paths = getCircuitPaths(config);

  await assertFileExists(paths.wasmPath, `WASM missing for ${circuitKey}. Run build first.`);
  await assertFileExists(paths.zkeyFinalPath, `Final zkey missing for ${circuitKey}. Run setup first.`);
  await assertFileExists(
    paths.verificationKeyPath,
    `Verification key missing for ${circuitKey}. Run setup first.`
  );

  const verificationKey = JSON.parse(await readFile(paths.verificationKeyPath, "utf8"));
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    stringifySignals(witnessInput),
    paths.wasmPath,
    paths.zkeyFinalPath
  );

  const verified = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
  if (!verified) {
    throw new Error(`Proof verification failed for ${circuitKey}`);
  }

  return { publicSignals };
}

async function main() {
  const poseidon = await buildPoseidon();

  // Dummy identity inputs.
  const agentDid = "did:patricon:agent:demo-001";
  const agentPublicKeyHash = hashTextToField(agentDid);
  const agentSecret = toField(987654321n);
  const identityNonce = 1n;

  // Policy parameters for both policy proof and identity-policy binding.
  const maxTrade = 1_000n;
  const dailyVolumeLimit = 5_000n;
  const minDelay = 300n;
  const allowedTokenIdA = 11n;
  const allowedTokenIdB = 42n;
  const policyHash = poseidonToBigInt(poseidon, [
    maxTrade,
    dailyVolumeLimit,
    minDelay,
    allowedTokenIdA,
    allowedTokenIdB
  ]);

  const merkleLeaf = poseidonToBigInt(poseidon, [agentPublicKeyHash, agentSecret]);
  const merkle = createMerkleArtifacts({
    poseidon,
    depth: 8,
    leaf: merkleLeaf,
    leafIndex: 9
  });

  const identityInput = {
    merkleRoot: merkle.merkleRoot,
    agentPublicKeyHash,
    policyHash,
    identityNonce,
    merkleLeaf,
    merklePathElements: merkle.merklePathElements,
    merklePathIndices: merkle.merklePathIndices,
    agentSecret
  };

  const policyInput = {
    maxTrade,
    dailyVolumeLimit,
    minDelay,
    allowedTokenIdA,
    allowedTokenIdB,
    previousCumulativeVolume: 1200n,
    previousTradeTimestamp: 1_710_000_000n,
    previousNonce: 18n,
    tokenId: 11n,
    newTradeTimestamp: 1_710_000_500n,
    tradeNonce: 19n,
    tradeAmount: 700n
  };

  const identityResult = await proveAndVerify("identity", identityInput);
  const policyResult = await proveAndVerify("policy", policyInput);

  console.log("Local Groth16 proofs verified successfully.");
  console.log(`Identity public signals: ${JSON.stringify(identityResult.publicSignals)}`);
  console.log(`Policy public signals: ${JSON.stringify(policyResult.publicSignals)}`);
}

await main();