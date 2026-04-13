import type { Contract } from "ethers";
import type { PoolStateClient } from "../clients/pool-state-client.js";
import { StructuredLogger } from "../logging/logger.js";
import type { YieldFarmingStrategy } from "../strategies/yield-farming-strategy.js";
import type { StrategyDecision } from "../strategies/yield-farming-strategy.js";
import type { PolicyProofService } from "../zk/policy-proof-service.js";

export type PatriconAgentConfig = {
  dryRun: boolean;
  signerAddress: string;
};

/**
 * Coordinates market observation, deterministic decisioning, proof generation, and transaction execution.
 */
export class PatriconAgent {
  private tradeNonce: bigint = 19n;

  constructor(
    private readonly config: PatriconAgentConfig,
    private readonly poolStateClient: PoolStateClient,
    private readonly strategy: YieldFarmingStrategy,
    private readonly proofService: PolicyProofService,
    private readonly defiAdapter: Contract,
    private readonly logger: StructuredLogger
  ) {}

  async tick(): Promise<void> {
    const state = await this.poolStateClient.getCurrentState();
    const decision = this.strategy.decide(state);

    this.logger.info("Decision evaluated", {
      action: decision.action,
      reason: decision.reason,
      apyBps: state.apyBps,
      exposure: state.currentExposure.toString(),
      poolId: state.poolId.toString()
    });

    if (decision.action === "hold") {
      return;
    }

    const timestamp = state.timestamp;
    const currentNonce = this.tradeNonce;

    try {
      const proofs = await this.proofService.generateActionProofs({
        tradeAmount: decision.amount,
        tokenId: decision.tokenId,
        timestamp,
        tradeNonce: currentNonce
      });

      this.logger.info("Proofs generated", {
        identityProofMs: proofs.identity.elapsedMs,
        policyProofMs: proofs.policy.elapsedMs,
        identityVerified: proofs.identity.verified,
        policyVerified: proofs.policy.verified,
        policySignals: proofs.policy.publicSignals.map((s) => s.toString())
      });

      if (this.config.dryRun) {
        this.logger.info("Dry run enabled, skipping transaction submission", {
          action: decision.action,
          amount: decision.amount.toString(),
          tokenId: decision.tokenId.toString(),
          nonce: currentNonce.toString()
        });
        this.tradeNonce += 1n;
        return;
      }

      await this.submitTransaction(decision, timestamp, currentNonce, proofs.identity, proofs.policy);
      this.tradeNonce += 1n;
    } catch (error) {
      this.logger.error("Proof generation or transaction submission failed; action skipped", {
        action: decision.action,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async submitTransaction(
    decision: StrategyDecision,
    timestamp: bigint,
    nonce: bigint,
    identityProof: { proof: { pA: [bigint, bigint]; pB: [[bigint, bigint], [bigint, bigint]]; pC: [bigint, bigint] }; publicSignals: bigint[] },
    policyProof: { proof: { pA: [bigint, bigint]; pB: [[bigint, bigint], [bigint, bigint]]; pC: [bigint, bigint] }; publicSignals: bigint[] }
  ): Promise<void> {
    const identitySignals = toFixedLength(identityProof.publicSignals, 6, "identity public signals");
    const policySignals = toFixedLength(policyProof.publicSignals, 14, "policy public signals");

    let tx;

    if (decision.action === "deposit") {
      tx = await this.defiAdapter.depositWithProof(
        this.config.signerAddress,
        decision.amount,
        decision.tokenId,
        timestamp,
        nonce,
        identityProof.proof,
        identitySignals,
        policyProof.proof,
        policySignals
      );
    } else if (decision.action === "withdraw") {
      tx = await this.defiAdapter.withdrawWithProof(
        this.config.signerAddress,
        decision.amount,
        decision.tokenId,
        timestamp,
        nonce,
        identityProof.proof,
        identitySignals,
        policyProof.proof,
        policySignals
      );
    } else {
      tx = await this.defiAdapter.rebalanceWithProof(
        this.config.signerAddress,
        decision.amount,
        decision.tokenId,
        decision.targetTokenId ?? decision.tokenId,
        timestamp,
        nonce,
        identityProof.proof,
        identitySignals,
        policyProof.proof,
        policySignals
      );
    }

    const receipt = await tx.wait();
    this.logger.info("Transaction submitted", {
      action: decision.action,
      hash: tx.hash,
      status: receipt?.status ?? "unknown"
    });
  }
}

function toFixedLength(values: bigint[], length: number, label: string): bigint[] {
  if (values.length !== length) {
    throw new Error(`Expected ${length} values for ${label}, received ${values.length}`);
  }
  return values;
}