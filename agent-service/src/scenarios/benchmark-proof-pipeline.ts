import { config } from "../config/env.js";
import { PolicyProofService } from "../zk/policy-proof-service.js";

async function main() {
  const runs = Number(process.env.BENCHMARK_RUNS ?? "5");

  const proofService = new PolicyProofService({
    identity: {
      merkleRoot: config.identity.merkleRoot,
      agentPublicKeyHash: config.identity.agentPublicKeyHash,
      identityNonce: config.identity.identityNonce,
      merkleLeaf: config.identity.merkleLeaf,
      merklePathElements: config.identity.merklePathElements,
      merklePathIndices: config.identity.merklePathIndices,
      agentSecret: config.identity.agentSecret
    },
    policy: {
      maxTrade: config.policy.maxTrade,
      dailyVolumeLimit: config.policy.dailyVolumeLimit,
      minDelaySeconds: config.policy.minDelaySeconds,
      allowedTokenA: config.policy.allowedTokenA,
      allowedTokenB: config.policy.allowedTokenB,
      policyHash: config.policy.policyHash
    },
    stateSeed: config.stateSeed,
    artifacts: config.zkArtifacts
  });

  await proofService.assertArtifactsExist();

  const results: number[] = [];
  for (let index = 0; index < runs; index += 1) {
    const startedAt = Date.now();
    await proofService.generatePolicyProof({
      tradeAmount: config.strategy.defaultTradeAmount,
      tokenId: config.strategy.whitelistedTokenIds[0],
      timestamp: BigInt(Math.floor(Date.now() / 1000) + index * Number(config.policy.minDelaySeconds)),
      tradeNonce: config.stateSeed.previousNonce + BigInt(index + 1)
    }, false);
    results.push(Date.now() - startedAt);
  }

  const total = results.reduce((sum, ms) => sum + ms, 0);
  const average = total / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);

  console.log(`Proof benchmark runs: ${runs}`);
  console.log(`Average proof time: ${average.toFixed(1)}ms`);
  console.log(`Min proof time: ${min}ms`);
  console.log(`Max proof time: ${max}ms`);

  const maxAllowed = Number(process.env.BENCHMARK_MAX_AVG_MS ?? "5000");
  if (average > maxAllowed) {
    throw new Error(`Average proof time ${average.toFixed(1)}ms exceeds threshold ${maxAllowed}ms.`);
  }
}

void main();
