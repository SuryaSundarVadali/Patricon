import { fullProveIdentity, toFixedLengthSignals, verifyGroth16 } from "./proofUtils";
import { ZK_ID_CIRCUIT, loadVerificationKey } from "./zkConfig";
import type {
  ContractProofBundle,
  CredentialPredicateResult,
  ZkIdInput
} from "./zkTypes";

const proofMemo = new Map<string, Promise<ContractProofBundle<6>>>();

function stableSerialize(input: unknown): string {
  return JSON.stringify(input, (_, value) => (typeof value === "bigint" ? value.toString() : value));
}

export function evaluateCredentialPredicates(input: ZkIdInput): CredentialPredicateResult {
  const { age, minAge, jurisdictionCode, allowedJurisdictions, riskScore, maxRiskScore } = input.credentials;

  return {
    ageCheckPassed: age >= minAge,
    jurisdictionCheckPassed: allowedJurisdictions.includes(jurisdictionCode),
    riskCheckPassed: riskScore <= maxRiskScore
  };
}

export async function generateZkIdProof(input: ZkIdInput): Promise<ContractProofBundle<6>> {
  const checks = evaluateCredentialPredicates(input);
  if (!checks.ageCheckPassed) {
    throw new Error("Credential check failed: age does not satisfy minimum age.");
  }
  if (!checks.jurisdictionCheckPassed) {
    throw new Error("Credential check failed: jurisdiction is not allowed.");
  }
  if (!checks.riskCheckPassed) {
    throw new Error("Credential check failed: risk score exceeds policy threshold.");
  }

  const memoKey = stableSerialize(input);
  const pending = proofMemo.get(memoKey);
  if (pending) {
    return pending;
  }

  const proofPromise = fullProveIdentity(
    input.identityWitness,
    ZK_ID_CIRCUIT.wasmUrl,
    ZK_ID_CIRCUIT.zkeyUrl
  ).then((bundle) => {
    toFixedLengthSignals(bundle.publicSignals, ZK_ID_CIRCUIT.expectedPublicSignalLength, "identity public signals");
    return {
      ...bundle,
      signalLength: 6
    } as ContractProofBundle<6>;
  });

  proofMemo.set(memoKey, proofPromise);
  return proofPromise;
}

export async function verifyZkIdProofLocally(bundle: ContractProofBundle<6>): Promise<boolean> {
  const verificationKey = await loadVerificationKey(ZK_ID_CIRCUIT.verificationKeyUrl);
  return verifyGroth16(verificationKey, bundle);
}

export function clearZkIdProofCache(): void {
  proofMemo.clear();
}
