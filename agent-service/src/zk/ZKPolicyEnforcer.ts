import type { Contract, Signer, TransactionReceipt } from "ethers";
import * as snarkjs from "snarkjs";
import ProverService, { type ZKProof } from "./ProverService.js";
import { CircuitNotFoundError, ZKPolicyViolationError } from "./errors.js";

export type AgentAction = {
  tradeValue: bigint;
  maxLimit: bigint;
  minLimit: bigint;
  jurisdiction: number;
  kycTier: number;
  requiredTier: number;
};

type SolidityProofCallData = {
  piA: [string, string];
  piB: [[string, string], [string, string]];
  piC: [string, string];
  publicSignals: [string];
};

/**
 * Enforces local and on-chain ZK policy checks before an agent action is executed.
 */
export class ZKPolicyEnforcer {
  /**
   * Constructs a new ZK policy enforcer.
   */
  constructor(
    private readonly proverService: ProverService,
    private readonly zkGateContract: Contract
  ) {}

  /**
   * Generates and verifies policy proofs, then submits them to PatriconZKGate.
   */
  async enforceAndExecute(
    agentAddress: string,
    action: AgentAction,
    signer: Signer
  ): Promise<TransactionReceipt> {
    const [policyProof, kycProof, jurisProof] = await Promise.all([
      this.proverService.generateAgentPolicyProof(action.tradeValue, action.maxLimit, action.minLimit),
      this.proverService.generateKYCProof(action.kycTier, action.requiredTier),
      this.proverService.generateJurisdictionProof(action.jurisdiction)
    ]);

    await this.assertLocalVerify("agent_policy", policyProof, "agent_policy");
    await this.assertLocalVerify("kyc_threshold", kycProof, "kyc_threshold");
    await this.assertLocalVerify("jurisdiction_check", jurisProof, "jurisdiction_check");

    const policyCallData = await this.toSolidityCallData(policyProof);
    const kycCallData = await this.toSolidityCallData(kycProof);
    const jurisdictionCallData = await this.toSolidityCallData(jurisProof);

    const gate = this.zkGateContract.connect(signer) as Contract & {
      verifyAndExecuteAction: (...args: unknown[]) => Promise<{ hash: string; wait: () => Promise<TransactionReceipt | null> }>;
    };

    const tx = await gate.verifyAndExecuteAction(
      agentAddress,
      policyCallData.piA,
      policyCallData.piB,
      policyCallData.piC,
      policyCallData.publicSignals,
      kycCallData.piA,
      kycCallData.piB,
      kycCallData.piC,
      kycCallData.publicSignals,
      jurisdictionCallData.piA,
      jurisdictionCallData.piB,
      jurisdictionCallData.piC,
      jurisdictionCallData.publicSignals
    );

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Missing transaction receipt from ZK gate call");
    }

    console.log(`ZK-gated action executed: ${tx.hash}`);
    return receipt;
  }

  private async assertLocalVerify(circuitName: string, proof: ZKProof, proofName: string): Promise<void> {
    let isValid = false;
    try {
      isValid = await this.proverService.verifyProof(circuitName, proof);
    } catch (error) {
      if (error instanceof CircuitNotFoundError) {
        throw error;
      }
      throw new ZKPolicyViolationError(proofName, `Local proof verification failed for ${proofName}`);
    }

    if (!isValid) {
      throw new ZKPolicyViolationError(proofName, `Invalid ${proofName} proof`);
    }
  }

  private async toSolidityCallData(zkProof: ZKProof): Promise<SolidityProofCallData> {
    const proofForExport = {
      pi_a: zkProof.proof.pi_a,
      pi_b: zkProof.proof.pi_b,
      pi_c: zkProof.proof.pi_c
    };

    const raw = await snarkjs.groth16.exportSolidityCallData(proofForExport, zkProof.publicSignals);
    const parsed = JSON.parse(`[${raw}]`) as [
      [string, string],
      [[string, string], [string, string]],
      [string, string],
      string[]
    ];

    if (parsed[3].length !== 1) {
      throw new Error(`Expected exactly one public signal for ${zkProof.circuitName}`);
    }

    return {
      piA: parsed[0],
      piB: parsed[1],
      piC: parsed[2],
      publicSignals: [parsed[3][0]]
    };
  }
}

export default ZKPolicyEnforcer;
