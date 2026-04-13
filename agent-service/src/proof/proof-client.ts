export type ProofBundle = {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: bigint[];
};

export async function generateProof(_input: Record<string, unknown>): Promise<ProofBundle> {
  return {
    pA: [0n, 0n],
    pB: [[0n, 0n], [0n, 0n]],
    pC: [0n, 0n],
    pubSignals: [0n]
  };
}
