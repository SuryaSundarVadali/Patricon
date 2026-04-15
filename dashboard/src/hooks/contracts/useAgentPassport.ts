import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReadContract,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import { AgentRegistryAbi } from "../../generated/contracts";
import { useContractResolution } from "./common";

export type RegisterPassportInput = {
  agentType: `0x${string}`;
  didHash: `0x${string}`;
  publicKeyHash: `0x${string}`;
  identityCommitment: `0x${string}`;
  identityVersion: bigint;
};

export function useAgentPassport(agentAddress?: `0x${string}`) {
  const queryClient = useQueryClient();
  const {
    account,
    address,
    chainId,
    disabledReason,
    missingDeployment
  } = useContractResolution("agentPassport");
  const { writeContractAsync, ...writeState } = useWriteContract();

  const targetAgent = agentAddress ?? account;

  const passport = useReadContract({
    abi: AgentRegistryAbi,
    address,
    functionName: "getAgentBinding",
    args: targetAgent ? [targetAgent] : undefined,
    query: {
      enabled: Boolean(address && targetAgent)
    }
  });

  const linkedIdentityRegistry = useReadContract({
    abi: AgentRegistryAbi,
    address,
    functionName: "erc8004IdentityRegistryOf",
    args: targetAgent ? [targetAgent] : undefined,
    query: {
      enabled: Boolean(address && targetAgent)
    }
  });

  const policyHash = (passport.data as readonly [`0x${string}`, `0x${string}`, `0x${string}`, boolean] | undefined)?.[2];

  const identityMerkleRoot = useReadContract({
    abi: AgentRegistryAbi,
    address,
    functionName: "identityMerkleRoot",
    query: {
      enabled: Boolean(address)
    }
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["agentPassport", chainId, targetAgent] });
  };

  useWatchContractEvent({
    address,
    abi: AgentRegistryAbi,
    eventName: "AgentRegistered",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: AgentRegistryAbi,
    eventName: "AgentStatusUpdated",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: AgentRegistryAbi,
    eventName: "IdentityMerkleRootUpdated",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: AgentRegistryAbi,
    eventName: "ERC8004IdentityLinked",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  const actions = useMemo(() => {
    const ensureAddress = () => {
      const deployedAddress = address;
      if (!deployedAddress) {
        throw new Error(disabledReason ?? "Agent registry deployment missing.");
      }
      return deployedAddress;
    };

    return {
      registerPassport: async (params: RegisterPassportInput) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: AgentRegistryAbi,
          functionName: "selfRegisterAgent",
          args: [
            params.agentType,
            params.didHash,
            params.publicKeyHash,
            params.identityCommitment,
            params.identityVersion
          ]
        });
      },
      updatePolicyWithProof: async (identityRegistry: `0x${string}`, erc8004AgentId: bigint) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: AgentRegistryAbi,
          functionName: "linkERC8004Identity",
          args: [identityRegistry, erc8004AgentId]
        });
      },
      revokePassport: async (agent: `0x${string}`) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: AgentRegistryAbi,
          functionName: "setAgentStatus",
          args: [agent, 3]
        });
      }
    };
  }, [address, disabledReason, writeContractAsync]);

  return {
    address,
    missingDeployment,
    disabledReason,
    getPassport: passport,
    getPolicyHash: policyHash,
    linkedIdentityRegistry,
    identityMerkleRoot,
    ...actions,
    writeState
  };
}
