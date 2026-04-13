import * as snarkjs from "snarkjs";
import type { FullProofBundle, Groth16Proof } from "./types.js";

type FullProveResult = {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
};

function parseProof(proof: FullProveResult["proof"]): Groth16Proof {
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])]
  };
}

function stringifyInputs(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "bigint") {
      out[key] = value.toString();
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((entry) => (typeof entry === "bigint" ? entry.toString() : entry));
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * Executes snarkjs fullProve and normalizes output into bigint-based calldata structures.
 */
export async function fullProve(
  witnessInput: Record<string, unknown>,
  wasmPath: string,
  zkeyPath: string
): Promise<FullProofBundle> {
  const startedAt = Date.now();
  const result = (await snarkjs.groth16.fullProve(
    stringifyInputs(witnessInput),
    wasmPath,
    zkeyPath
  )) as unknown as FullProveResult;

  return {
    proof: parseProof(result.proof),
    publicSignals: result.publicSignals.map((s) => BigInt(s)),
    elapsedMs: Date.now() - startedAt
  };
}