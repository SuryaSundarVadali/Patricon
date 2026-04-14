import type { Address } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const policyRegistryWriteAbi = [
  {
    type: "function",
    name: "registerOrUpdatePolicy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "policyHash", type: "bytes32" },
      { name: "policyVersion", type: "uint64" },
      { name: "circuitVersion", type: "uint64" },
      { name: "active", type: "bool" }
    ],
    outputs: []
  }
] as const;

export const agentRegistryWriteAbi = [
  {
    type: "function",
    name: "registerOrUpdateAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "agentType", type: "bytes32" },
      { name: "didHash", type: "bytes32" },
      { name: "publicKeyHash", type: "bytes32" },
      { name: "identityCommitment", type: "bytes32" },
      { name: "identityVersion", type: "uint64" },
      { name: "active", type: "bool" }
    ],
    outputs: []
  }
] as const;

export const settlementWriteAbi = [
  {
    type: "function",
    name: "executeSettlementWithProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentRef", type: "bytes32" },
      { name: "agent", type: "address" },
      { name: "payer", type: "address" },
      { name: "payee", type: "address" },
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "tokenId", type: "uint256" },
      { name: "executionTimestamp", type: "uint256" },
      { name: "tradeNonce", type: "uint256" },
      {
        name: "policyProof",
        type: "tuple",
        components: [
          { name: "pA", type: "uint256[2]" },
          { name: "pB", type: "uint256[2][2]" },
          { name: "pC", type: "uint256[2]" }
        ]
      },
      { name: "policySignals", type: "uint256[14]" }
    ],
    outputs: []
  }
] as const;

export const roleManagedReadAbi = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

export function isConfiguredAddress(address: string): address is Address {
  return address.toLowerCase() !== ZERO_ADDRESS;
}
