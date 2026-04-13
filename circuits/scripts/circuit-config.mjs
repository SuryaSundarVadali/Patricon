import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const packageRoot = path.resolve(__dirname, "..");
export const compiledRoot = path.join(packageRoot, "compiled");
export const contractsVerifierRoot = path.resolve(packageRoot, "../contracts/contracts/verifier");

export const circuitConfigs = {
  identity: {
    key: "identity",
    sourceRelativePath: "identity/agent_registry_membership.circom",
    sourceBaseName: "agent_registry_membership",
    verifierContractName: "PatriconIdentityVerifier.sol"
  },
  policy: {
    key: "policy",
    sourceRelativePath: "policy/yield_policy_enforcement.circom",
    sourceBaseName: "yield_policy_enforcement",
    verifierContractName: "PatriconPolicyVerifier.sol"
  }
};

export function getCircuitConfig(key) {
  const config = circuitConfigs[key];
  if (!config) {
    const validKeys = Object.keys(circuitConfigs).join(", ");
    throw new Error(`Unknown circuit key '${key}'. Expected one of: ${validKeys}`);
  }
  return config;
}

export function getCircuitPaths(config) {
  const sourcePath = path.join(packageRoot, config.sourceRelativePath);
  const artifactDir = path.join(compiledRoot, config.key);
  const r1csPath = path.join(artifactDir, `${config.sourceBaseName}.r1cs`);
  const wasmPath = path.join(
    artifactDir,
    `${config.sourceBaseName}_js`,
    `${config.sourceBaseName}.wasm`
  );
  const symPath = path.join(artifactDir, `${config.sourceBaseName}.sym`);
  const zkey0Path = path.join(artifactDir, `${config.sourceBaseName}_0000.zkey`);
  const zkeyFinalPath = path.join(artifactDir, `${config.sourceBaseName}_final.zkey`);
  const verificationKeyPath = path.join(artifactDir, "verification_key.json");
  const provingKeyPath = path.join(artifactDir, "proving_key.json");
  const solidityVerifierPath = path.join(contractsVerifierRoot, config.verifierContractName);

  return {
    sourcePath,
    artifactDir,
    r1csPath,
    wasmPath,
    symPath,
    zkey0Path,
    zkeyFinalPath,
    verificationKeyPath,
    provingKeyPath,
    solidityVerifierPath
  };
}