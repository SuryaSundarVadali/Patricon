import { readFile } from "node:fs/promises";
import { fullProve, verifyProof } from "./snarkjs-client.js";
import type {
  ActionProofBundle,
  IdentityWitnessInput,
  PolicyWitnessInput,
  VerifiedProofBundle
} from "./types.js";

export type ProofActionContext = {
  tradeAmount: bigint;
  tokenId: bigint;
  timestamp: bigint;
  tradeNonce: bigint;
};

export type PolicyProofServiceConfig = {
  identity: Omit<IdentityWitnessInput, "policyHash">;
  policy: {
    maxTrade: bigint;
    dailyVolumeLimit: bigint;
    minDelaySeconds: bigint;
    allowedTokenA: bigint;
    allowedTokenB: bigint;
    policyHash: bigint;
  };
  stateSeed: {
    previousCumulativeVolume: bigint;
    previousTradeTimestamp: bigint;
    previousNonce: bigint;
  };
  artifacts: {
    identityWasmPath: string;
    identityZkeyPath: string;
    identityVerificationKeyPath: string;
    policyWasmPath: string;
    policyZkeyPath: string;
    policyVerificationKeyPath: string;
  };
};

/**
 * Produces Groth16 proofs for Patricon identity and policy circuits.
 */
export class PolicyProofService {
  private previousCumulativeVolume: bigint;
  private previousTradeTimestamp: bigint;
  private previousNonce: bigint;
  private identityVerificationKey: Record<string, unknown> | null = null;
  private policyVerificationKey: Record<string, unknown> | null = null;

  constructor(private readonly config: PolicyProofServiceConfig) {
    this.previousCumulativeVolume = config.stateSeed.previousCumulativeVolume;
    this.previousTradeTimestamp = config.stateSeed.previousTradeTimestamp;
    this.previousNonce = config.stateSeed.previousNonce;
  }

  async assertArtifactsExist(): Promise<void> {
    const paths = [
      this.config.artifacts.identityWasmPath,
      this.config.artifacts.identityZkeyPath,
      this.config.artifacts.identityVerificationKeyPath,
      this.config.artifacts.policyWasmPath,
      this.config.artifacts.policyZkeyPath,
      this.config.artifacts.policyVerificationKeyPath
    ];

    const fileContents = await Promise.all(paths.map(async (artifactPath) => readFile(artifactPath, "utf8")));
    this.identityVerificationKey = JSON.parse(fileContents[2]);
    this.policyVerificationKey = JSON.parse(fileContents[5]);
  }

  async generateActionProofs(action: ProofActionContext): Promise<ActionProofBundle> {
    const identityWitness = this.buildIdentityWitness();

    const identityRaw = await fullProve(
      identityWitness as unknown as Record<string, unknown>,
      this.config.artifacts.identityWasmPath,
      this.config.artifacts.identityZkeyPath
    );

    const policyRaw = await this.generatePolicyProof(action, false);

    const identity = await this.toVerifiedProof(identityRaw, "identity");

    this.previousCumulativeVolume += action.tradeAmount;
    this.previousTradeTimestamp = action.timestamp;
    this.previousNonce = action.tradeNonce;

    return {
      identity,
      policy: policyRaw
    };
  }

  async generatePolicyProof(action: ProofActionContext, updateState: boolean = true): Promise<VerifiedProofBundle> {
    const policyWitness = this.buildPolicyWitness(action);
    const policyRaw = await fullProve(
      policyWitness as unknown as Record<string, unknown>,
      this.config.artifacts.policyWasmPath,
      this.config.artifacts.policyZkeyPath
    );

    const verifiedPolicy = await this.toVerifiedProof(policyRaw, "policy");

    if (updateState) {
      this.previousCumulativeVolume += action.tradeAmount;
      this.previousTradeTimestamp = action.timestamp;
      this.previousNonce = action.tradeNonce;
    }

    return verifiedPolicy;
  }

  getCurrentState(): { previousCumulativeVolume: bigint; previousTradeTimestamp: bigint; previousNonce: bigint } {
    return {
      previousCumulativeVolume: this.previousCumulativeVolume,
      previousTradeTimestamp: this.previousTradeTimestamp,
      previousNonce: this.previousNonce
    };
  }

  private async toVerifiedProof(
    bundle: { proof: { pA: [bigint, bigint]; pB: [[bigint, bigint], [bigint, bigint]]; pC: [bigint, bigint] }; publicSignals: bigint[]; elapsedMs: number },
    circuit: "identity" | "policy"
  ): Promise<VerifiedProofBundle> {
    const verificationKey = circuit === "identity" ? this.identityVerificationKey : this.policyVerificationKey;
    if (!verificationKey) {
      throw new Error(`Verification key not loaded for ${circuit} circuit. Call assertArtifactsExist first.`);
    }

    const verified = await verifyProof(verificationKey, bundle.publicSignals, bundle.proof);

    return {
      ...bundle,
      verified
    };
  }

  private buildIdentityWitness(): IdentityWitnessInput {
    return {
      merkleRoot: this.config.identity.merkleRoot,
      agentPublicKeyHash: this.config.identity.agentPublicKeyHash,
      policyHash: this.config.policy.policyHash,
      identityNonce: this.config.identity.identityNonce,
      merkleLeaf: this.config.identity.merkleLeaf,
      merklePathElements: this.config.identity.merklePathElements,
      merklePathIndices: this.config.identity.merklePathIndices,
      agentSecret: this.config.identity.agentSecret
    };
  }

  private buildPolicyWitness(action: ProofActionContext): PolicyWitnessInput {
    return {
      maxTrade: this.config.policy.maxTrade,
      dailyVolumeLimit: this.config.policy.dailyVolumeLimit,
      minDelay: this.config.policy.minDelaySeconds,
      allowedTokenIdA: this.config.policy.allowedTokenA,
      allowedTokenIdB: this.config.policy.allowedTokenB,
      previousCumulativeVolume: this.previousCumulativeVolume,
      previousTradeTimestamp: this.previousTradeTimestamp,
      previousNonce: this.previousNonce,
      tokenId: action.tokenId,
      newTradeTimestamp: action.timestamp,
      tradeNonce: action.tradeNonce,
      tradeAmount: action.tradeAmount
    };
  }
}