type CircuitKey = "identity" | "policy";

declare const __PATRICON_CIRCUITS_DIR__: string;

export type CircuitArtifactConfig = {
  key: CircuitKey;
  wasmUrl: string;
  zkeyUrl: string;
  verificationKeyUrl: string;
  expectedPublicSignalLength: number;
  verifierContractKey: "identityVerifier" | "policyVerifier";
};

function getEnv(name: string): string | undefined {
  const value = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  return value && value.trim().length > 0 ? value : undefined;
}

function fsArtifact(path: string): string {
  return `/@fs/${__PATRICON_CIRCUITS_DIR__}/${path}`;
}

const identityWasm =
  getEnv("VITE_ZK_IDENTITY_WASM_URL")
  ?? fsArtifact("compiled/identity/agent_registry_membership_js/agent_registry_membership.wasm");
const identityZkey =
  getEnv("VITE_ZK_IDENTITY_ZKEY_URL")
  ?? fsArtifact("compiled/identity/agent_registry_membership_final.zkey");
const identityVkey =
  getEnv("VITE_ZK_IDENTITY_VKEY_URL")
  ?? fsArtifact("compiled/identity/verification_key.json");

const policyWasm =
  getEnv("VITE_ZK_POLICY_WASM_URL")
  ?? fsArtifact("compiled/policy/yield_policy_enforcement_js/yield_policy_enforcement.wasm");
const policyZkey =
  getEnv("VITE_ZK_POLICY_ZKEY_URL")
  ?? fsArtifact("compiled/policy/yield_policy_enforcement_final.zkey");
const policyVkey =
  getEnv("VITE_ZK_POLICY_VKEY_URL")
  ?? fsArtifact("compiled/policy/verification_key.json");

export const ZK_ID_CIRCUIT: CircuitArtifactConfig = {
  key: "identity",
  wasmUrl: identityWasm,
  zkeyUrl: identityZkey,
  verificationKeyUrl: identityVkey,
  expectedPublicSignalLength: 6,
  verifierContractKey: "identityVerifier"
};

export const POLICY_CIRCUIT: CircuitArtifactConfig = {
  key: "policy",
  wasmUrl: policyWasm,
  zkeyUrl: policyZkey,
  verificationKeyUrl: policyVkey,
  expectedPublicSignalLength: 14,
  verifierContractKey: "policyVerifier"
};

const verificationKeyCache = new Map<string, Promise<Record<string, unknown>>>();

export async function loadVerificationKey(url: string): Promise<Record<string, unknown>> {
  const existing = verificationKeyCache.get(url);
  if (existing) {
    return existing;
  }

  const pending = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Unable to fetch verification key from ${url} (${response.status}).`);
    }
    return response.json() as Promise<Record<string, unknown>>;
  });

  verificationKeyCache.set(url, pending);
  return pending;
}

export async function warmZkArtifacts(): Promise<void> {
  await Promise.all([
    loadVerificationKey(ZK_ID_CIRCUIT.verificationKeyUrl),
    loadVerificationKey(POLICY_CIRCUIT.verificationKeyUrl)
  ]);
}
