import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig({ path: "../.env" });

const EnvSchema = z.object({
  HASHKEY_TESTNET_RPC_URL: z.string().url(),
  HASHKEY_TESTNET_CHAIN_ID: z.coerce.number().int().positive(),
  PRIVATE_KEY: z.string().min(1),
  POLICY_REGISTRY_ADDRESS: z.string().length(42),
  PROOF_VERIFIER_ADDRESS: z.string().length(42),
  DEFI_ADAPTER_ADDRESS: z.string().length(42)
});

export type AgentEnv = z.infer<typeof EnvSchema>;
export const env: AgentEnv = EnvSchema.parse(process.env);
