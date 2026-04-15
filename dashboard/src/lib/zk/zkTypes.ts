export type Groth16ContractProof = {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
};

export type ContractProofBundle<SignalLength extends number> = {
  proof: Groth16ContractProof;
  publicSignals: readonly bigint[];
  signalLength: SignalLength;
};

export type CredentialPredicateInput = {
  age: number;
  minAge: number;
  jurisdictionCode: number;
  allowedJurisdictions: number[];
  riskScore: number;
  maxRiskScore: number;
};

export type CredentialPredicateResult = {
  ageCheckPassed: boolean;
  jurisdictionCheckPassed: boolean;
  riskCheckPassed: boolean;
};

export type IdentityWitnessInput = {
  merkleRoot: bigint;
  agentPublicKeyHash: bigint;
  policyHash: bigint;
  identityNonce: bigint;
  merkleLeaf: bigint;
  merklePathElements: readonly bigint[];
  merklePathIndices: readonly bigint[];
  agentSecret: bigint;
};

export type ZkIdInput = {
  credentials: CredentialPredicateInput;
  identityWitness: IdentityWitnessInput;
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

export type PolicyProofInput = {
  policyWitness: PolicyWitnessInput;
};
