import { JsonRpcProvider, Wallet } from "ethers";
import { env } from "../config/env.js";

export function createSigner() {
  const provider = new JsonRpcProvider(env.HASHKEY_TESTNET_RPC_URL, env.HASHKEY_TESTNET_CHAIN_ID);
  return new Wallet(env.PRIVATE_KEY, provider);
}
