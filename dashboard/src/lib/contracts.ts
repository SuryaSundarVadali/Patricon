import type { Address } from "viem";

import hashkeyTestnetDeployment from "../../../config/deployments/hashkeyTestnet.json";
import sepoliaDeployment from "../../../config/deployments/sepolia.json";
import {
  hashkeyTestnet,
  sepolia,
  type SupportedChainName
} from "../web3/config";
import {
  AgentRegistryAbi,
  ERC8004IdentityRegistryAbi,
  ERC8004ReputationRegistryAbi,
  ERC8004ValidationRegistryAbi,
  IYieldPoolAbi,
  PolicyEnforcedDeFiAdapterAbi,
  PolicyRegistryAbi,
  SettlementConnectorAbi,
  VerifierIdentityAbi,
  VerifierPolicyAbi
} from "../generated/contracts";

export {
  AgentRegistryAbi,
  ERC8004IdentityRegistryAbi,
  ERC8004ReputationRegistryAbi,
  ERC8004ValidationRegistryAbi,
  IYieldPoolAbi,
  PolicyEnforcedDeFiAdapterAbi,
  PolicyRegistryAbi,
  SettlementConnectorAbi,
  VerifierIdentityAbi,
  VerifierPolicyAbi
};

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export type ChainDeployment = {
  identityVerifier: string;
  policyVerifier: string;
  policyRegistry: string;
  agentRegistry: string;
  targetPool: string;
  policyEnforcedDeFiAdapter: string;
  settlementConnector: string;
  identityRegistry?: string;
  reputationRegistry?: string;
  validationRegistry?: string;
  erc8004PolicyRegistry?: string;
  erc8004AgentRegistry?: string;
};

export type ContractKey =
  | "patriconCore"
  | "vault"
  | "zkPolicyRegistry"
  | "agentPassport"
  | "erc8004IdentityRegistry"
  | "erc8004ReputationRegistry"
  | "erc8004ValidationRegistry"
  | "identityVerifier"
  | "policyVerifier"
  | "policyRegistry"
  | "agentRegistry"
  | "policyEnforcedDeFiAdapter"
  | "settlementConnector"
  | "targetPool";

export type ContractAddressSet = Record<ContractKey, Address>;

const deploymentByChain: Record<number, ChainDeployment> = {
  [hashkeyTestnet.id]: hashkeyTestnetDeployment as ChainDeployment,
  [sepolia.id]: sepoliaDeployment as ChainDeployment
};

const chainNameById: Record<number, SupportedChainName> = {
  [hashkeyTestnet.id]: "hashkeyTestnet",
  [sepolia.id]: "sepolia"
};

function toAddress(value: string | undefined): Address {
  const normalized = value && value.trim().length > 0 ? value : ZERO_ADDRESS;
  return normalized as Address;
}

function readEnvAddress(networkName: string, key: string): Address | undefined {
  const envKey = `VITE_${networkName.toUpperCase()}_${key}`;
  const value = import.meta.env[envKey as keyof ImportMetaEnv] as string | undefined;
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value as Address;
}

function resolveAddressSet(chainId: number): ContractAddressSet {
  const deployment = deploymentByChain[chainId];
  const networkName = chainNameById[chainId];

  if (!deployment || !networkName) {
    return {
      patriconCore: ZERO_ADDRESS,
      vault: ZERO_ADDRESS,
      zkPolicyRegistry: ZERO_ADDRESS,
      agentPassport: ZERO_ADDRESS,
      erc8004IdentityRegistry: ZERO_ADDRESS,
      erc8004ReputationRegistry: ZERO_ADDRESS,
      erc8004ValidationRegistry: ZERO_ADDRESS,
      identityVerifier: ZERO_ADDRESS,
      policyVerifier: ZERO_ADDRESS,
      policyRegistry: ZERO_ADDRESS,
      agentRegistry: ZERO_ADDRESS,
      policyEnforcedDeFiAdapter: ZERO_ADDRESS,
      settlementConnector: ZERO_ADDRESS,
      targetPool: ZERO_ADDRESS
    };
  }

  const identityRegistry =
    readEnvAddress(networkName, "ERC8004_IDENTITY_REGISTRY")
    ?? toAddress(deployment.identityRegistry);
  const reputationRegistry =
    readEnvAddress(networkName, "ERC8004_REPUTATION_REGISTRY")
    ?? toAddress(deployment.reputationRegistry);
  const validationRegistry =
    readEnvAddress(networkName, "ERC8004_VALIDATION_REGISTRY")
    ?? toAddress(deployment.validationRegistry);

  const policyRegistry =
    readEnvAddress(networkName, "POLICY_REGISTRY")
    ?? toAddress(deployment.policyRegistry);
  const agentRegistry =
    readEnvAddress(networkName, "AGENT_REGISTRY")
    ?? toAddress(deployment.agentRegistry);
  const targetPool =
    readEnvAddress(networkName, "TARGET_POOL")
    ?? toAddress(deployment.targetPool);
  const policyEnforcedDeFiAdapter =
    readEnvAddress(networkName, "POLICY_ENFORCED_DEFI_ADAPTER")
    ?? toAddress(deployment.policyEnforcedDeFiAdapter);

  return {
    patriconCore: policyEnforcedDeFiAdapter,
    vault: targetPool,
    zkPolicyRegistry: policyRegistry,
    agentPassport: agentRegistry,
    erc8004IdentityRegistry: identityRegistry,
    erc8004ReputationRegistry: reputationRegistry,
    erc8004ValidationRegistry: validationRegistry,
    identityVerifier:
      readEnvAddress(networkName, "IDENTITY_VERIFIER")
      ?? toAddress(deployment.identityVerifier),
    policyVerifier:
      readEnvAddress(networkName, "POLICY_VERIFIER")
      ?? toAddress(deployment.policyVerifier),
    policyRegistry,
    agentRegistry,
    policyEnforcedDeFiAdapter,
    settlementConnector:
      readEnvAddress(networkName, "SETTLEMENT_CONNECTOR")
      ?? toAddress(deployment.settlementConnector),
    targetPool
  };
}

export const CONTRACT_ADDRESSES = {
  [hashkeyTestnet.id]: resolveAddressSet(hashkeyTestnet.id),
  [sepolia.id]: resolveAddressSet(sepolia.id)
} as const;

export type SupportedContractChainId = keyof typeof CONTRACT_ADDRESSES;

export function isConfiguredAddress(address: string | undefined): address is Address {
  return typeof address === "string" && address.toLowerCase() !== ZERO_ADDRESS;
}

export function getContractAddress(chainId: number, key: ContractKey): Address | undefined {
  const chainAddresses = CONTRACT_ADDRESSES[chainId as SupportedContractChainId];
  if (!chainAddresses) {
    return undefined;
  }

  const address = chainAddresses[key];
  return isConfiguredAddress(address) ? address : undefined;
}

export function requireContractAddress(chainId: number, key: ContractKey): Address {
  const address = getContractAddress(chainId, key);
  if (!address) {
    const name = chainNameById[chainId] ?? `chain-${chainId}`;
    throw new Error(`Missing deployment for ${key} on ${name}. Configure config/deployments or VITE_* overrides.`);
  }
  return address;
}

export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function getTrustedValidators(): Address[] {
  const raw = (import.meta.env.VITE_TRUSTED_VALIDATORS as string | undefined) ?? "";
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item as Address);
}

export function isTrustedValidator(address: string | undefined): boolean {
  if (!address) {
    return false;
  }

  const validators = getTrustedValidators();
  if (validators.length === 0) {
    return false;
  }

  return validators.some((validator) => normalizeAddress(validator) === normalizeAddress(address));
}
