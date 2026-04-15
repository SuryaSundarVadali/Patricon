import { fullProvePolicy, toFixedLengthSignals, verifyGroth16 } from "./proofUtils";
import { POLICY_CIRCUIT, loadVerificationKey } from "./zkConfig";
import type { ContractProofBundle, PolicyProofInput } from "./zkTypes";

const proofMemo = new Map<string, Promise<ContractProofBundle<14>>>();

function stableSerialize(input: unknown): string {
  return JSON.stringify(input, (_, value) => (typeof value === "bigint" ? value.toString() : value));
}

export async function generatePolicyProof(input: PolicyProofInput): Promise<ContractProofBundle<14>> {
  const memoKey = stableSerialize(input);
  const pending = proofMemo.get(memoKey);
  if (pending) {
    return pending;
  }

  const proofPromise = fullProvePolicy(
    input.policyWitness,
    POLICY_CIRCUIT.wasmUrl,
    POLICY_CIRCUIT.zkeyUrl
  ).then((bundle) => {
    toFixedLengthSignals(bundle.publicSignals, POLICY_CIRCUIT.expectedPublicSignalLength, "policy public signals");
    return {
      ...bundle,
      signalLength: 14
    } as ContractProofBundle<14>;
  });

  proofMemo.set(memoKey, proofPromise);
  return proofPromise;
}

export async function verifyPolicyProofLocally(bundle: ContractProofBundle<14>): Promise<boolean> {
  const verificationKey = await loadVerificationKey(POLICY_CIRCUIT.verificationKeyUrl);
  return verifyGroth16(verificationKey, bundle);
}

export function clearPolicyProofCache(): void {
  proofMemo.clear();
}
