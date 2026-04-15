import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import rawCircuitPaths from "../../../config/zkCircuitPaths.json" with { type: "json" };
import { CircuitNotFoundError, ProofGenerationError } from "./errors.js";

export type ZKProof = {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
  };
  publicSignals: string[];
  circuitName: string;
};

type CircuitPathConfig = {
  wasm: string;
  zkey: string;
  verificationKey: string;
};

type CircuitName = "agent_policy" | "kyc_threshold" | "jurisdiction_check";

type FullProveResult = {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol?: string;
  };
  publicSignals: string[];
};

type VerificationKey = Record<string, unknown>;
type PoseidonFn = Awaited<ReturnType<typeof buildPoseidon>>;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function resolveCircuitPaths(config: Record<string, CircuitPathConfig>): Record<CircuitName, CircuitPathConfig> {
  return {
    agent_policy: {
      wasm: path.resolve(REPO_ROOT, config.agent_policy.wasm),
      zkey: path.resolve(REPO_ROOT, config.agent_policy.zkey),
      verificationKey: path.resolve(REPO_ROOT, config.agent_policy.verificationKey)
    },
    kyc_threshold: {
      wasm: path.resolve(REPO_ROOT, config.kyc_threshold.wasm),
      zkey: path.resolve(REPO_ROOT, config.kyc_threshold.zkey),
      verificationKey: path.resolve(REPO_ROOT, config.kyc_threshold.verificationKey)
    },
    jurisdiction_check: {
      wasm: path.resolve(REPO_ROOT, config.jurisdiction_check.wasm),
      zkey: path.resolve(REPO_ROOT, config.jurisdiction_check.zkey),
      verificationKey: path.resolve(REPO_ROOT, config.jurisdiction_check.verificationKey)
    }
  };
}

export const ZK_CIRCUIT_PATHS = resolveCircuitPaths(rawCircuitPaths as Record<string, CircuitPathConfig>);

function normalizeInput(input: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "bigint") {
      normalized[key] = value.toString();
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

async function loadVerificationKey(circuitName: CircuitName): Promise<VerificationKey> {
  const pathConfig = ZK_CIRCUIT_PATHS[circuitName];
  const raw = await readFile(pathConfig.verificationKey, "utf8");
  return JSON.parse(raw) as VerificationKey;
}

class ProverService {
  private poseidonPromise: Promise<PoseidonFn> | null = null;

  async generateAgentPolicyProof(tradeValue: bigint, maxLimit: bigint, minLimit: bigint): Promise<ZKProof> {
    const poseidon = await this.getPoseidon();
    const F = poseidon.F;
    const policyHash = F.toString(poseidon([maxLimit, minLimit]));

    const input = {
      tradeValue,
      maxAllowedLimit: maxLimit,
      minAllowedLimit: minLimit,
      policyHash
    };

    return this.generateProof("agent_policy", input, `tradeValue=${tradeValue},maxLimit=${maxLimit},minLimit=${minLimit}`);
  }

  async generateKYCProof(actualTier: number, requiredTier: number): Promise<ZKProof> {
    const input = {
      actualTier,
      requiredTier
    };

    return this.generateProof("kyc_threshold", input, `actualTier=${actualTier},requiredTier=${requiredTier}`);
  }

  async generateJurisdictionProof(jurisdiction: number): Promise<ZKProof> {
    const poseidon = await this.getPoseidon();
    const F = poseidon.F;
    const allowedSetHash = F.toString(poseidon([1n, 2n, 3n]));

    const input = {
      jurisdiction,
      allowedSetHash
    };

    return this.generateProof("jurisdiction_check", input, `jurisdiction=${jurisdiction}`);
  }

  async verifyProof(circuitName: string, proof: ZKProof): Promise<boolean> {
    if (!(circuitName in ZK_CIRCUIT_PATHS)) {
      throw new CircuitNotFoundError(circuitName);
    }

    const typedCircuitName = circuitName as CircuitName;
    const verificationKey = await loadVerificationKey(typedCircuitName);

    return snarkjs.groth16.verify(verificationKey, proof.publicSignals, proof.proof);
  }

  private async generateProof(
    circuitName: CircuitName,
    input: Record<string, unknown>,
    inputSummary: string
  ): Promise<ZKProof> {
    const paths = ZK_CIRCUIT_PATHS[circuitName];

    try {
      const result = (await snarkjs.groth16.fullProve(
        normalizeInput(input),
        paths.wasm,
        paths.zkey
      )) as unknown as FullProveResult;

      return {
        proof: {
          pi_a: result.proof.pi_a,
          pi_b: result.proof.pi_b,
          pi_c: result.proof.pi_c,
          protocol: result.proof.protocol ?? "groth16"
        },
        publicSignals: result.publicSignals,
        circuitName
      };
    } catch (error) {
      throw new ProofGenerationError(circuitName, inputSummary, error);
    }
  }

  private async getPoseidon(): Promise<PoseidonFn> {
    if (!this.poseidonPromise) {
      this.poseidonPromise = buildPoseidon();
    }
    return this.poseidonPromise;
  }
}

export default ProverService;
