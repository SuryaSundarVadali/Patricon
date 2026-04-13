import { createHashKeyClients } from "./clients/hashkey-client.js";
import { LivePoolStateClient, SimulatedPoolStateClient } from "./clients/pool-state-client.js";
import { config } from "./config/env.js";
import { StructuredLogger } from "./logging/logger.js";
import { PatriconAgent } from "./agents/patricon-agent.js";
import { YieldFarmingStrategy } from "./strategies/yield-farming-strategy.js";
import { PolicyProofService } from "./zk/policy-proof-service.js";

async function main(): Promise<void> {
  const logger = new StructuredLogger("patricon.agent-service");

  const clients = createHashKeyClients({
    rpcUrl: config.chain.rpcUrl,
    chainId: config.chain.chainId,
    privateKey: config.chain.privateKey,
    defiAdapterAddress: config.contracts.defiAdapter
  });

  const signerAddress = await clients.signer.getAddress();

  const poolStateClient =
    config.mode === "simulated"
      ? new SimulatedPoolStateClient()
      : new LivePoolStateClient(config.strategy.whitelistedTokenIds[0], config.strategy.maxExposure);

  const strategy = new YieldFarmingStrategy(config.strategy);
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
    artifacts: {
      identityWasmPath: config.zkArtifacts.identityWasmPath,
      identityZkeyPath: config.zkArtifacts.identityZkeyPath,
      identityVerificationKeyPath: config.zkArtifacts.identityVerificationKeyPath,
      policyWasmPath: config.zkArtifacts.policyWasmPath,
      policyZkeyPath: config.zkArtifacts.policyZkeyPath,
      policyVerificationKeyPath: config.zkArtifacts.policyVerificationKeyPath
    }
  });

  const agent = new PatriconAgent(
    {
      dryRun: config.dryRun,
      signerAddress
    },
    poolStateClient,
    strategy,
    proofService,
    clients.defiAdapter,
    logger.child("runtime")
  );

  logger.info("Patricon agent initialized", {
    mode: config.mode,
    dryRun: config.dryRun,
    signerAddress,
    chainId: config.chain.chainId
  });

  try {
    await proofService.assertArtifactsExist();
  } catch (error) {
    logger.error("Missing circuit artifacts for proof generation", {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
    return;
  }

  const iterations = config.mode === "simulated" ? 3 : Number.POSITIVE_INFINITY;
  for (let i = 0; i < iterations; i++) {
    await agent.tick();

    if (i < iterations - 1) {
      await delay(config.pollIntervalMs);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  const logger = new StructuredLogger("patricon.agent-service");
  logger.error("Unhandled runtime failure", {
    error: error instanceof Error ? error.stack ?? error.message : String(error)
  });
  process.exitCode = 1;
});