import { id, type Contract } from "ethers";
import { StructuredLogger } from "../logging/logger.js";
import type { PolicyProofService } from "../zk/policy-proof-service.js";
import type { SettlementAction } from "./settlement-action.js";

export type SettlementServiceConfig = {
  dryRun: boolean;
};

/**
 * Handles policy-proven settlement execution through Patricon SettlementConnector.
 */
export class SettlementService {
  constructor(
    private readonly config: SettlementServiceConfig,
    private readonly settlementConnector: Contract,
    private readonly proofService: PolicyProofService,
    private readonly logger: StructuredLogger
  ) {}

  async executeSettlement(action: SettlementAction): Promise<void> {
    const policyProof = await this.proofService.generatePolicyProof({
      tradeAmount: action.amount,
      tokenId: action.tokenId,
      timestamp: action.timestamp,
      tradeNonce: action.tradeNonce
    });

    this.logger.info("Settlement proof generated", {
      paymentRef: action.paymentRef,
      elapsedMs: policyProof.elapsedMs,
      verified: policyProof.verified,
      publicSignals: policyProof.publicSignals.map((s) => s.toString())
    });

    if (!policyProof.verified) {
      this.logger.warn("Settlement proof verification failed locally; skipping on-chain call", {
        paymentRef: action.paymentRef
      });
      return;
    }

    if (this.config.dryRun) {
      this.logger.info("Dry run enabled, settlement submission skipped", {
        paymentRef: action.paymentRef,
        amount: action.amount.toString(),
        payee: action.payee
      });
      return;
    }

    const policySignals = toFixedLength(policyProof.publicSignals, 14, "policy settlement public signals");
    const tx = await this.settlementConnector.executeSettlementWithProof(
      id(action.paymentRef),
      action.agent,
      action.payer,
      action.payee,
      action.asset,
      action.amount,
      action.tokenId,
      action.timestamp,
      action.tradeNonce,
      policyProof.proof,
      policySignals
    );
    const receipt = await tx.wait();

    this.logger.info("Settlement submitted", {
      paymentRef: action.paymentRef,
      txHash: tx.hash,
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