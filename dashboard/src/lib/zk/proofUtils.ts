import { groth16 } from "snarkjs";

import type {
  ContractProofBundle,
  Groth16ContractProof,
  IdentityWitnessInput,
  PolicyWitnessInput
} from "./zkTypes";

type SnarkjsProof = {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
};

type SnarkjsFullProveResult = {
  proof: SnarkjsProof;
  publicSignals: string[];
};

function normalizeBigintArray(values: readonly bigint[]): string[] {
  return values.map((value) => value.toString());
}

function stringifyInputObject(input: Record<string, unknown>): Record<string, unknown> {
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

export function toContractGroth16Proof(snarkProof: SnarkjsProof): Groth16ContractProof {
  return {
    pA: [BigInt(snarkProof.pi_a[0]), BigInt(snarkProof.pi_a[1])],
    pB: [
      [BigInt(snarkProof.pi_b[0][1]), BigInt(snarkProof.pi_b[0][0])],
      [BigInt(snarkProof.pi_b[1][1]), BigInt(snarkProof.pi_b[1][0])]
    ],
    pC: [BigInt(snarkProof.pi_c[0]), BigInt(snarkProof.pi_c[1])]
  };
}

function toSnarkjsProof(proof: Groth16ContractProof): SnarkjsProof {
  return {
    pi_a: [proof.pA[0].toString(), proof.pA[1].toString(), "1"],
    pi_b: [
      [proof.pB[0][1].toString(), proof.pB[0][0].toString()],
      [proof.pB[1][1].toString(), proof.pB[1][0].toString()],
      ["1", "0"]
    ],
    pi_c: [proof.pC[0].toString(), proof.pC[1].toString(), "1"]
  };
}

export async function fullProveIdentity(
  witness: IdentityWitnessInput,
  wasmUrl: string,
  zkeyUrl: string
): Promise<ContractProofBundle<6>> {
  const result = (await groth16.fullProve(
    stringifyInputObject(witness as unknown as Record<string, unknown>),
    wasmUrl,
    zkeyUrl
  )) as unknown as SnarkjsFullProveResult;

  return {
    proof: toContractGroth16Proof(result.proof),
    publicSignals: result.publicSignals.map((signal) => BigInt(signal)),
    signalLength: 6
  };
}

export async function fullProvePolicy(
  witness: PolicyWitnessInput,
  wasmUrl: string,
  zkeyUrl: string
): Promise<ContractProofBundle<14>> {
  const result = (await groth16.fullProve(
    stringifyInputObject(witness as unknown as Record<string, unknown>),
    wasmUrl,
    zkeyUrl
  )) as unknown as SnarkjsFullProveResult;

  return {
    proof: toContractGroth16Proof(result.proof),
    publicSignals: result.publicSignals.map((signal) => BigInt(signal)),
    signalLength: 14
  };
}

export async function verifyGroth16(
  verificationKey: Record<string, unknown>,
  bundle: ContractProofBundle<number>
): Promise<boolean> {
  return groth16.verify(
    verificationKey,
    normalizeBigintArray(bundle.publicSignals),
    toSnarkjsProof(bundle.proof)
  );
}

export function toFixedLengthSignals<const L extends number>(
  signals: readonly bigint[],
  length: L,
  label: string
): readonly bigint[] {
  if (signals.length !== length) {
    throw new Error(`Expected ${length} ${label}, got ${signals.length}.`);
  }
  return signals;
}

export function serializeForWorker(bundle: ContractProofBundle<number>): Uint8Array {
  const payload = {
    proof: {
      pA: [bundle.proof.pA[0].toString(), bundle.proof.pA[1].toString()],
      pB: [
        [bundle.proof.pB[0][0].toString(), bundle.proof.pB[0][1].toString()],
        [bundle.proof.pB[1][0].toString(), bundle.proof.pB[1][1].toString()]
      ],
      pC: [bundle.proof.pC[0].toString(), bundle.proof.pC[1].toString()]
    },
    publicSignals: bundle.publicSignals.map((signal) => signal.toString()),
    signalLength: bundle.signalLength
  };

  return new TextEncoder().encode(JSON.stringify(payload));
}

export function deserializeFromWorker(bytes: ArrayBufferLike): ContractProofBundle<number> {
  const decoded = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes))) as {
    proof: { pA: [string, string]; pB: [[string, string], [string, string]]; pC: [string, string] };
    publicSignals: string[];
    signalLength: number;
  };

  return {
    proof: {
      pA: [BigInt(decoded.proof.pA[0]), BigInt(decoded.proof.pA[1])],
      pB: [
        [BigInt(decoded.proof.pB[0][0]), BigInt(decoded.proof.pB[0][1])],
        [BigInt(decoded.proof.pB[1][0]), BigInt(decoded.proof.pB[1][1])]
      ],
      pC: [BigInt(decoded.proof.pC[0]), BigInt(decoded.proof.pC[1])]
    },
    publicSignals: decoded.publicSignals.map((signal) => BigInt(signal)),
    signalLength: decoded.signalLength
  };
}
