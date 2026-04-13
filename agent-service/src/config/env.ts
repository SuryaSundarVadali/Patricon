import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig({ path: "../.env" });

const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const EnvSchema = z.object({
  AGENT_MODE: z.enum(["agent", "simulated"]).default("agent"),
  PATRICON_DRY_RUN: z.coerce.boolean().default(false),
  AGENT_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),

  HASHKEY_TESTNET_RPC_URL: z.string().url().default("https://rpc.testnet.hashkey.cloud"),
  HASHKEY_TESTNET_CHAIN_ID: z.coerce.number().int().positive().default(133),
  AGENT_WALLET_RPC_URL: z.string().url().default("http://127.0.0.1:8545"),
  AGENT_ACCOUNT_ADDRESS: AddressSchema.default("0x0000000000000000000000000000000000000011"),

  DEFI_ADAPTER_ADDRESS: AddressSchema.default("0x0000000000000000000000000000000000000001"),
  POLICY_REGISTRY_ADDRESS: AddressSchema.default("0x0000000000000000000000000000000000000002"),
  AGENT_REGISTRY_ADDRESS: AddressSchema.default("0x0000000000000000000000000000000000000003"),
  IDENTITY_VERIFIER_ADDRESS: AddressSchema.default("0x0000000000000000000000000000000000000004"),
  POLICY_VERIFIER_ADDRESS: AddressSchema.default("0x0000000000000000000000000000000000000005"),
  SETTLEMENT_CONNECTOR_ADDRESS: AddressSchema.default("0x0000000000000000000000000000000000000006"),
  SETTLEMENT_PAYEE_ADDRESS: AddressSchema.default("0x00000000000000000000000000000000000000AA"),
  SETTLEMENT_PAYER_ADDRESS: AddressSchema.optional(),
  SETTLEMENT_ASSET_ADDRESS: AddressSchema.default("0x00000000000000000000000000000000000000BB"),
  SETTLEMENT_TOKEN_ID: z.coerce.bigint().default(11n),
  SETTLEMENT_SHARE_BPS: z.coerce.number().int().min(1).max(10_000).default(5_000),

  APY_DEPOSIT_THRESHOLD_BPS: z.coerce.number().int().positive().default(1_000),
  APY_WITHDRAW_THRESHOLD_BPS: z.coerce.number().int().positive().default(700),
  MAX_ALLOCATION_BPS: z.coerce.number().int().min(1).max(10_000).default(4_000),
  MAX_EXPOSURE: z.coerce.bigint().default(5_000n),
  DEFAULT_TRADE_AMOUNT: z.coerce.bigint().default(500n),
  WHITELISTED_TOKEN_IDS: z.string().default("11,42"),

  POLICY_MAX_TRADE: z.coerce.bigint().default(1_000n),
  POLICY_DAILY_VOLUME_LIMIT: z.coerce.bigint().default(5_000n),
  POLICY_MIN_DELAY_SECONDS: z.coerce.bigint().default(300n),

  IDENTITY_MERKLE_ROOT: z.coerce.bigint().default(2001n),
  AGENT_PUBLIC_KEY_HASH: z.coerce.bigint().default(1002n),
  POLICY_HASH: z.coerce.bigint().default(3001n),
  IDENTITY_COMMITMENT: z.coerce.bigint().default(1003n),
  IDENTITY_NONCE: z.coerce.bigint().default(1n),
  MERKLE_LEAF: z.coerce.bigint().default(1003n),
  MERKLE_PATH_ELEMENTS: z.string().default("0,0,0,0,0,0,0,0"),
  MERKLE_PATH_INDICES: z.string().default("0,0,0,0,0,0,0,0"),
  AGENT_SECRET: z.coerce.bigint().default(987654321n),

  PREVIOUS_CUMULATIVE_VOLUME: z.coerce.bigint().default(1200n),
  PREVIOUS_TRADE_TIMESTAMP: z.coerce.bigint().default(1_710_000_000n),
  PREVIOUS_NONCE: z.coerce.bigint().default(18n),

  IDENTITY_WASM_PATH: z.string().default("../circuits/compiled/identity/agent_registry_membership_js/agent_registry_membership.wasm"),
  IDENTITY_ZKEY_PATH: z.string().default("../circuits/compiled/identity/agent_registry_membership_final.zkey"),
  IDENTITY_VKEY_PATH: z.string().default("../circuits/compiled/identity/verification_key.json"),
  POLICY_WASM_PATH: z.string().default("../circuits/compiled/policy/yield_policy_enforcement_js/yield_policy_enforcement.wasm"),
  POLICY_ZKEY_PATH: z.string().default("../circuits/compiled/policy/yield_policy_enforcement_final.zkey"),
  POLICY_VKEY_PATH: z.string().default("../circuits/compiled/policy/verification_key.json")
});

export type AgentRuntimeEnv = z.infer<typeof EnvSchema>;

function parseCsvBigIntList(raw: string): bigint[] {
  return raw.split(",").map((v) => BigInt(v.trim()));
}

function normalizePath(input: string): string {
  return path.resolve(process.cwd(), input);
}

function assertListLength(values: bigint[], length: number, label: string): bigint[] {
  if (values.length !== length) {
    throw new Error(`${label} must include exactly ${length} comma-separated values`);
  }
  return values;
}

export type PatriconConfig = {
  mode: "agent" | "simulated";
  dryRun: boolean;
  pollIntervalMs: number;
  chain: {
    rpcUrl: string;
    chainId: number;
    walletRpcUrl: string;
    accountAddress: string;
  };
  contracts: {
    defiAdapter: string;
    policyRegistry: string;
    agentRegistry: string;
    identityVerifier: string;
    policyVerifier: string;
    settlementConnector: string;
  };
  settlement: {
    payee: string;
    payerOverride?: string;
    asset: string;
    tokenId: bigint;
    shareBps: number;
  };
  strategy: {
    apyDepositThresholdBps: number;
    apyWithdrawThresholdBps: number;
    maxAllocationBps: number;
    maxExposure: bigint;
    defaultTradeAmount: bigint;
    whitelistedTokenIds: bigint[];
  };
  policy: {
    maxTrade: bigint;
    dailyVolumeLimit: bigint;
    minDelaySeconds: bigint;
    allowedTokenA: bigint;
    allowedTokenB: bigint;
    policyHash: bigint;
  };
  identity: {
    merkleRoot: bigint;
    agentPublicKeyHash: bigint;
    identityCommitment: bigint;
    identityNonce: bigint;
    merkleLeaf: bigint;
    merklePathElements: bigint[];
    merklePathIndices: bigint[];
    agentSecret: bigint;
  };
  stateSeed: {
    previousCumulativeVolume: bigint;
    previousTradeTimestamp: bigint;
    previousNonce: bigint;
  };
  zkArtifacts: {
    identityWasmPath: string;
    identityZkeyPath: string;
    identityVerificationKeyPath: string;
    policyWasmPath: string;
    policyZkeyPath: string;
    policyVerificationKeyPath: string;
  };
};

const env = EnvSchema.parse(process.env);
const parsedTokenIds = parseCsvBigIntList(env.WHITELISTED_TOKEN_IDS);

if (parsedTokenIds.length < 2) {
  throw new Error("WHITELISTED_TOKEN_IDS must include at least two token IDs");
}

export const config: PatriconConfig = {
  mode: env.AGENT_MODE,
  dryRun: env.PATRICON_DRY_RUN || env.AGENT_MODE === "simulated",
  pollIntervalMs: env.AGENT_POLL_INTERVAL_MS,
  chain: {
    rpcUrl: env.HASHKEY_TESTNET_RPC_URL,
    chainId: env.HASHKEY_TESTNET_CHAIN_ID,
    walletRpcUrl: env.AGENT_WALLET_RPC_URL,
    accountAddress: env.AGENT_ACCOUNT_ADDRESS
  },
  contracts: {
    defiAdapter: env.DEFI_ADAPTER_ADDRESS,
    policyRegistry: env.POLICY_REGISTRY_ADDRESS,
    agentRegistry: env.AGENT_REGISTRY_ADDRESS,
    identityVerifier: env.IDENTITY_VERIFIER_ADDRESS,
    policyVerifier: env.POLICY_VERIFIER_ADDRESS,
    settlementConnector: env.SETTLEMENT_CONNECTOR_ADDRESS
  },
  settlement: {
    payee: env.SETTLEMENT_PAYEE_ADDRESS,
    payerOverride: env.SETTLEMENT_PAYER_ADDRESS,
    asset: env.SETTLEMENT_ASSET_ADDRESS,
    tokenId: env.SETTLEMENT_TOKEN_ID,
    shareBps: env.SETTLEMENT_SHARE_BPS
  },
  strategy: {
    apyDepositThresholdBps: env.APY_DEPOSIT_THRESHOLD_BPS,
    apyWithdrawThresholdBps: env.APY_WITHDRAW_THRESHOLD_BPS,
    maxAllocationBps: env.MAX_ALLOCATION_BPS,
    maxExposure: env.MAX_EXPOSURE,
    defaultTradeAmount: env.DEFAULT_TRADE_AMOUNT,
    whitelistedTokenIds: parsedTokenIds
  },
  policy: {
    maxTrade: env.POLICY_MAX_TRADE,
    dailyVolumeLimit: env.POLICY_DAILY_VOLUME_LIMIT,
    minDelaySeconds: env.POLICY_MIN_DELAY_SECONDS,
    allowedTokenA: parsedTokenIds[0],
    allowedTokenB: parsedTokenIds[1],
    policyHash: env.POLICY_HASH
  },
  identity: {
    merkleRoot: env.IDENTITY_MERKLE_ROOT,
    agentPublicKeyHash: env.AGENT_PUBLIC_KEY_HASH,
    identityCommitment: env.IDENTITY_COMMITMENT,
    identityNonce: env.IDENTITY_NONCE,
    merkleLeaf: env.MERKLE_LEAF,
    merklePathElements: assertListLength(parseCsvBigIntList(env.MERKLE_PATH_ELEMENTS), 8, "MERKLE_PATH_ELEMENTS"),
    merklePathIndices: assertListLength(parseCsvBigIntList(env.MERKLE_PATH_INDICES), 8, "MERKLE_PATH_INDICES"),
    agentSecret: env.AGENT_SECRET
  },
  stateSeed: {
    previousCumulativeVolume: env.PREVIOUS_CUMULATIVE_VOLUME,
    previousTradeTimestamp: env.PREVIOUS_TRADE_TIMESTAMP,
    previousNonce: env.PREVIOUS_NONCE
  },
  zkArtifacts: {
    identityWasmPath: normalizePath(env.IDENTITY_WASM_PATH),
    identityZkeyPath: normalizePath(env.IDENTITY_ZKEY_PATH),
    identityVerificationKeyPath: normalizePath(env.IDENTITY_VKEY_PATH),
    policyWasmPath: normalizePath(env.POLICY_WASM_PATH),
    policyZkeyPath: normalizePath(env.POLICY_ZKEY_PATH),
    policyVerificationKeyPath: normalizePath(env.POLICY_VKEY_PATH)
  }
};