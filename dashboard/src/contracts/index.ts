import type { Address } from "viem";

import {
  AgentRegistryAbi,
  PolicyRegistryAbi,
  SettlementConnectorAbi
} from "../generated/contracts";
export {
  CONTRACT_ADDRESSES,
  ZERO_ADDRESS,
  getContractAddress,
  isConfiguredAddress,
  normalizeAddress,
  requireContractAddress
} from "../lib/contracts";

// Backward-compatible aliases used by existing dashboard components.
export const policyRegistryWriteAbi = PolicyRegistryAbi;
export const agentRegistryWriteAbi = AgentRegistryAbi;
export const settlementWriteAbi = SettlementConnectorAbi;

export const roleManagedReadAbi = AgentRegistryAbi;

export function isConfiguredAddressLegacy(address: string): address is Address {
  return address.toLowerCase() !== "0x0000000000000000000000000000000000000000";
}
