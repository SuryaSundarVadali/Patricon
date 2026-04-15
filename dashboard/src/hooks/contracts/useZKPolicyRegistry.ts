import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReadContract,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import { PolicyRegistryAbi } from "../../generated/contracts";
import { useContractResolution } from "./common";

export type RegisterPolicyInput = {
  agent: `0x${string}`;
  policyHash: `0x${string}`;
  policyVersion: bigint;
  circuitVersion: bigint;
  active: boolean;
};

export function useZKPolicyRegistry(agent?: `0x${string}`) {
  const queryClient = useQueryClient();
  const {
    account,
    address,
    chainId,
    disabledReason,
    missingDeployment
  } = useContractResolution("zkPolicyRegistry");
  const { writeContractAsync, ...writeState } = useWriteContract();

  const targetAgent = agent ?? account;

  const policy = useReadContract({
    abi: PolicyRegistryAbi,
    address,
    functionName: "getPolicyForAgent",
    args: targetAgent ? [targetAgent] : undefined,
    query: {
      enabled: Boolean(address && targetAgent)
    }
  });

  const policyHash = useReadContract({
    abi: PolicyRegistryAbi,
    address,
    functionName: "policyHashOf",
    args: targetAgent ? [targetAgent] : undefined,
    query: {
      enabled: Boolean(address && targetAgent)
    }
  });

  const paused = useReadContract({
    abi: PolicyRegistryAbi,
    address,
    functionName: "paused",
    query: {
      enabled: Boolean(address)
    }
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["zkPolicyRegistry", chainId, targetAgent] });
  };

  useWatchContractEvent({
    address,
    abi: PolicyRegistryAbi,
    eventName: "PolicyConfigured",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: PolicyRegistryAbi,
    eventName: "PolicyStatusUpdated",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  const actions = useMemo(() => {
    const ensureAddress = () => {
      const deployedAddress = address;
      if (!deployedAddress) {
        throw new Error(disabledReason ?? "Policy registry deployment missing.");
      }
      return deployedAddress;
    };

    return {
      registerPolicy: async (params: RegisterPolicyInput) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: PolicyRegistryAbi,
          functionName: "registerOrUpdatePolicy",
          args: [
            params.agent,
            params.policyHash,
            params.policyVersion,
            params.circuitVersion,
            params.active
          ]
        });
      },
      attachPolicyToAgent: async (policyHashValue: `0x${string}`, policyVersion: bigint, circuitVersion: bigint) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: PolicyRegistryAbi,
          functionName: "selfRegisterPolicy",
          args: [policyHashValue, policyVersion, circuitVersion]
        });
      }
    };
  }, [address, disabledReason, writeContractAsync]);

  return {
    address,
    missingDeployment,
    disabledReason,
    getPolicy: policy,
    getVerifyingKey: undefined,
    policyHash,
    paused,
    ...actions,
    writeState
  };
}
