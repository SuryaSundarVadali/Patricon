import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReadContract,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import { ERC8004ReputationRegistryAbi } from "../../generated/contracts";
import { useContractResolution } from "./common";

export type SubmitFeedbackInput = {
  agentId: bigint;
  value: bigint;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  endpointURI: string;
  fileURI: string;
  fileHash: `0x${string}`;
};

export function scaleFeedbackValue(value: number, decimals: number): bigint {
  const scaled = Math.round(value * 10 ** decimals);
  return BigInt(scaled);
}

export function useErc8004Reputation(agentId?: bigint) {
  const queryClient = useQueryClient();
  const {
    address,
    chainId,
    disabledReason,
    missingDeployment
  } = useContractResolution("erc8004ReputationRegistry");
  const { writeContractAsync, ...writeState } = useWriteContract();

  const clients = useReadContract({
    abi: ERC8004ReputationRegistryAbi,
    address,
    functionName: "getClients",
    args: agentId ? [agentId] : undefined,
    query: {
      enabled: Boolean(address && agentId)
    }
  });

  const feedbackEntries = useReadContract({
    abi: ERC8004ReputationRegistryAbi,
    address,
    functionName: "readAllFeedback",
    args:
      address && agentId
        ? [agentId, (clients.data as `0x${string}`[] | undefined) ?? [], "", "", false]
        : undefined,
    query: {
      enabled: Boolean(address && agentId && clients.data)
    }
  });

  const aggregatedScore = useReadContract({
    abi: ERC8004ReputationRegistryAbi,
    address,
    functionName: "getSummary",
    args:
      address && agentId
        ? [agentId, (clients.data as `0x${string}`[] | undefined) ?? [], "", ""]
        : undefined,
    query: {
      enabled: Boolean(address && agentId && clients.data)
    }
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["erc8004Reputation", chainId, agentId] });
  };

  useWatchContractEvent({
    address,
    abi: ERC8004ReputationRegistryAbi,
    eventName: "NewFeedback",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: ERC8004ReputationRegistryAbi,
    eventName: "FeedbackRevoked",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: ERC8004ReputationRegistryAbi,
    eventName: "ResponseAppended",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  const actions = useMemo(() => {
    const ensureAddress = () => {
      const deployedAddress = address;
      if (!deployedAddress) {
        throw new Error(disabledReason ?? "ERC-8004 reputation registry deployment missing.");
      }
      return deployedAddress;
    };

    return {
      submitFeedback: async (params: SubmitFeedbackInput) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: ERC8004ReputationRegistryAbi,
          functionName: "giveFeedback",
          args: [
            params.agentId,
            params.value,
            params.valueDecimals,
            params.tag1,
            params.tag2,
            params.endpointURI,
            params.fileURI,
            params.fileHash
          ]
        });
      },
      revokeFeedback: async (forAgentId: bigint, feedbackIndex: bigint) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: ERC8004ReputationRegistryAbi,
          functionName: "revokeFeedback",
          args: [forAgentId, feedbackIndex]
        });
      }
    };
  }, [address, disabledReason, writeContractAsync]);

  return {
    address,
    missingDeployment,
    disabledReason,
    getFeedbackEntries: feedbackEntries,
    getAggregatedScore: aggregatedScore,
    scaleFeedbackValue,
    ...actions,
    writeState
  };
}
