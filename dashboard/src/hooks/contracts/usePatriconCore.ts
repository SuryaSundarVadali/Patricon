import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReadContract,
  useReadContracts,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import {
  PolicyEnforcedDeFiAdapterAbi,
  type Groth16Proof
} from "../../generated/contracts";
import { useContractResolution } from "./common";

type ProofSignals = {
  identitySignals: readonly bigint[];
  policySignals: readonly bigint[];
};

export type AdapterActionInput = {
  agent: `0x${string}`;
  amount: bigint;
  tokenId: bigint;
  executionTimestamp: bigint;
  tradeNonce: bigint;
  identityProof: Groth16Proof;
  policyProof: Groth16Proof;
} & ProofSignals;

export function usePatriconCore() {
  const queryClient = useQueryClient();
  const { address, chainId, disabledReason, missingDeployment } = useContractResolution("patriconCore");
  const { writeContractAsync, ...writeState } = useWriteContract();

  const readEnabled = Boolean(address);

  const reads = useReadContracts({
    contracts: address
      ? [
          {
            address,
            abi: PolicyEnforcedDeFiAdapterAbi,
            functionName: "paused"
          },
          {
            address,
            abi: PolicyEnforcedDeFiAdapterAbi,
            functionName: "permissionlessExecution"
          }
        ]
      : undefined,
    query: {
      enabled: readEnabled
    }
  });

  const paused = reads.data?.[0]?.result as boolean | undefined;
  const permissionlessExecution = reads.data?.[1]?.result as boolean | undefined;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["patriconCore", chainId] });
  };

  useWatchContractEvent({
    address,
    abi: PolicyEnforcedDeFiAdapterAbi,
    eventName: "DepositExecuted",
    enabled: readEnabled,
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: PolicyEnforcedDeFiAdapterAbi,
    eventName: "WithdrawExecuted",
    enabled: readEnabled,
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: PolicyEnforcedDeFiAdapterAbi,
    eventName: "RebalanceExecuted",
    enabled: readEnabled,
    onLogs: invalidate
  });

  const actions = useMemo(() => {
    const ensureAddress = () => {
      const deployedAddress = address;
      if (!deployedAddress) {
        throw new Error(disabledReason ?? "Patricon core deployment is missing.");
      }
      return deployedAddress;
    };

    return {
      deposit: async (params: AdapterActionInput) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: PolicyEnforcedDeFiAdapterAbi,
          functionName: "depositWithProof",
          args: [
            params.agent,
            params.amount,
            params.tokenId,
            params.executionTimestamp,
            params.tradeNonce,
            params.identityProof,
            params.identitySignals as [bigint, bigint, bigint, bigint, bigint, bigint],
            params.policyProof,
            params.policySignals as [
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint
            ]
          ]
        });
      },
      withdraw: async (params: AdapterActionInput) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: PolicyEnforcedDeFiAdapterAbi,
          functionName: "withdrawWithProof",
          args: [
            params.agent,
            params.amount,
            params.tokenId,
            params.executionTimestamp,
            params.tradeNonce,
            params.identityProof,
            params.identitySignals as [bigint, bigint, bigint, bigint, bigint, bigint],
            params.policyProof,
            params.policySignals as [
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint
            ]
          ]
        });
      },
      claimRewards: async (params: AdapterActionInput & { fromTokenId: bigint; toTokenId: bigint }) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: PolicyEnforcedDeFiAdapterAbi,
          functionName: "rebalanceWithProof",
          args: [
            params.agent,
            params.amount,
            params.fromTokenId,
            params.toTokenId,
            params.executionTimestamp,
            params.tradeNonce,
            params.identityProof,
            params.identitySignals as [bigint, bigint, bigint, bigint, bigint, bigint],
            params.policyProof,
            params.policySignals as [
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint
            ]
          ]
        });
      }
    };
  }, [address, disabledReason, writeContractAsync]);

  return {
    address,
    missingDeployment,
    disabledReason,
    reads,
    paused,
    permissionlessExecution,
    getGlobalTVL: undefined,
    getUserPositions: undefined,
    getPendingRewards: undefined,
    ...actions,
    writeState
  };
}
