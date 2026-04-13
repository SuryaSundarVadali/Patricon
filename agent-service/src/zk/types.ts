export type Groth16Proof = {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
};

export type IdentityWitnessInput = {
  merkleRoot: bigint;
  agentPublicKeyHash: bigint;
  policyHash: bigint;
  identityNonce: bigint;
  merkleLeaf: bigint;
  merklePathElements: bigint[];
  merklePathIndices: bigint[];
  agentSecret: bigint;
};

export type PolicyWitnessInput = {
  maxTrade: bigint;
  dailyVolumeLimit: bigint;
  minDelay: bigint;
  allowedTokenIdA: bigint;
  allowedTokenIdB: bigint;
  previousCumulativeVolume: bigint;
  previousTradeTimestamp: bigint;
  previousNonce: bigint;
  tokenId: bigint;
  newTradeTimestamp: bigint;
  tradeNonce: bigint;
  tradeAmount: bigint;
};

export type FullProofBundle = {
  proof: Groth16Proof;
  publicSignals: bigint[];
  elapsedMs: number;
};

export type VerifiedProofBundle = FullProofBundle & {
  verified: boolean;
};

export type ActionProofBundle = {
  identity: VerifiedProofBundle;
  policy: VerifiedProofBundle;
};