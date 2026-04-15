import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import { ERC8004ReputationRegistryAbi } from "../../generated/contracts";
import { measure } from "../../lib/profiling";
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

export function buildSubmitFeedbackWriteCall(address: `0x${string}`, params: SubmitFeedbackInput) {
  return {
    address,
    abi: ERC8004ReputationRegistryAbi,
    functionName: "giveFeedback" as const,
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
  };
}

export function useErc8004Reputation(agentId?: bigint) {
  const queryClient = useQueryClient();
  const { address: account } = useAccount();
  const {
    address,
    chainId,
    wrongNetwork,
    disabledReason,
    missingDeployment
  } = useContractResolution("erc8004ReputationRegistry");
  const publicClient = usePublicClient({ chainId });
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

  const feedbackEntries = useQuery({
    queryKey: ["erc8004Reputation", "readAllFeedback", chainId, address, agentId, clients.data],
    enabled: Boolean(publicClient && address && agentId && clients.data),
    queryFn: async () => {
      if (!publicClient || !address || !agentId) {
        throw new Error("Reputation registry read prerequisites are missing.");
      }
      const clientList = (clients.data as `0x${string}`[] | undefined) ?? [];
      const { result } = await measure("erc8004.reputation.readAllFeedback", async () => publicClient.readContract({
        address,
        abi: ERC8004ReputationRegistryAbi,
        functionName: "readAllFeedback",
        args: [agentId, clientList, "", "", false]
      }));
      return result;
    }
  });

  const aggregatedScore = useQuery({
    queryKey: ["erc8004Reputation", "getSummary", chainId, address, agentId, clients.data],
    enabled: Boolean(publicClient && address && agentId && clients.data),
    queryFn: async () => {
      if (!publicClient || !address || !agentId) {
        throw new Error("Reputation registry read prerequisites are missing.");
      }
      const clientList = (clients.data as `0x${string}`[] | undefined) ?? [];
      const { result } = await measure("erc8004.reputation.getSummary", async () => publicClient.readContract({
        address,
        abi: ERC8004ReputationRegistryAbi,
        functionName: "getSummary",
        args: [agentId, clientList, "", ""]
      }));
      return result;
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
      if (!account) {
        throw new Error("Wallet is not connected.");
      }
      if (wrongNetwork || missingDeployment) {
        throw new Error("Wrong network for ERC-8004 reputation contract deployment.");
      }
      const deployedAddress = address;
      if (!deployedAddress) {
        throw new Error(disabledReason ?? "ERC-8004 reputation registry deployment missing.");
      }
      return deployedAddress;
    };

    return {
      submitFeedback: async (params: SubmitFeedbackInput) => {
        const deployedAddress = ensureAddress();
        const { result } = await measure("erc8004.reputation.submitFeedback", async () => writeContractAsync(buildSubmitFeedbackWriteCall(deployedAddress, params)));
        return result;
      },
      revokeFeedback: async (forAgentId: bigint, feedbackIndex: bigint) => {
        const deployedAddress = ensureAddress();
        const { result } = await measure("erc8004.reputation.revokeFeedback", async () => writeContractAsync({
          address: deployedAddress,
          abi: ERC8004ReputationRegistryAbi,
          functionName: "revokeFeedback",
          args: [forAgentId, feedbackIndex]
        }));
        return result;
      }
    };
  }, [account, address, disabledReason, missingDeployment, writeContractAsync, wrongNetwork]);

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
