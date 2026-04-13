import { createHashKeyClients } from "../clients/hashkey-client.js";
import { config } from "../config/env.js";
import { StructuredLogger } from "../logging/logger.js";
import { buildSettlementAction } from "../settlement/settlement-action.js";
import { SettlementService } from "../settlement/settlement-service.js";
import { PolicyProofService } from "../zk/policy-proof-service.js";

async function main(): Promise<void> {
  const logger = new StructuredLogger("patricon.settlement-demo");
  const clients = createHashKeyClients({
    rpcUrl: config.chain.rpcUrl,
    chainId: config.chain.chainId,
    privateKey: config.chain.privateKey,
    defiAdapterAddress: config.contracts.defiAdapter,
    settlementConnectorAddress: config.contracts.settlementConnector
  });

  const signerAddress = await clients.signer.getAddress();
  const payer = config.settlement.payerOverride ?? signerAddress;

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

  await proofService.assertArtifactsExist();

  const settlementService = new SettlementService(
    { dryRun: config.dryRun },
    clients.settlementConnector,
    proofService,
    logger.child("settlement")
  );

  const now = BigInt(Math.floor(Date.now() / 1000));
  const depositAmount = 700n;

  logger.info("Step 1: Deposit simulated", {
    amount: depositAmount.toString(),
    poolTokenId: config.strategy.whitelistedTokenIds[0].toString(),
    mode: config.dryRun ? "dry-run" : "live"
  });

  const policyProofForDeposit = await proofService.generatePolicyProof(
    {
      tradeAmount: depositAmount,
      tokenId: config.strategy.whitelistedTokenIds[0],
      timestamp: now,
      tradeNonce: config.stateSeed.previousNonce + 1n
    },
    true
  );

  logger.info("Step 1 proof results", {
    policyProofMs: policyProofForDeposit.elapsedMs,
    policyProofVerified: policyProofForDeposit.verified
  });

  const realizedYield = 220n;
  logger.info("Step 2: Yield accrued", {
    realizedYield: realizedYield.toString()
  });

  const settlementAction = buildSettlementAction({
    agent: signerAddress,
    payer,
    payee: config.settlement.payee,
    asset: config.settlement.asset,
    tokenId: config.settlement.tokenId,
    realizedYield,
    shareBps: config.settlement.shareBps,
    policyMaxTrade: config.policy.maxTrade,
    timestamp: now + 600n,
    tradeNonce: config.stateSeed.previousNonce + 2n
  });

  if (!settlementAction) {
    logger.warn("Step 3: Settlement skipped because no payable amount was produced");
    return;
  }

  logger.info("Step 3: Execute settlement via SettlementConnector", {
    paymentRef: settlementAction.paymentRef,
    amount: settlementAction.amount.toString(),
    payee: settlementAction.payee,
    asset: settlementAction.asset,
    reason: settlementAction.reason
  });

  await settlementService.executeSettlement(settlementAction);
}

main().catch((error) => {
  const logger = new StructuredLogger("patricon.settlement-demo");
  logger.error("Settlement demo failed", {
    error: error instanceof Error ? error.stack ?? error.message : String(error)
  });
  process.exitCode = 1;
});