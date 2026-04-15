import { formatUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useWriteContract } from "wagmi";

import { IYieldPoolAbi } from "../../generated/contracts";
import { getYieldHistory } from "../../lib/api/agentService";
import { useContractResolution } from "./common";

export type VaultActionInput = {
  beneficiary: `0x${string}`;
  amount: bigint;
  tokenId: bigint;
};

export function computeEstimatedApy(
  previousTotalAssets: bigint,
  currentTotalAssets: bigint,
  elapsedSeconds: number
): number {
  if (previousTotalAssets <= 0n || currentTotalAssets <= previousTotalAssets || elapsedSeconds <= 0) {
    return 0;
  }

  const growth = Number(currentTotalAssets - previousTotalAssets) / Number(previousTotalAssets);
  const yearSeconds = 365 * 24 * 60 * 60;
  return growth * (yearSeconds / elapsedSeconds) * 100;
}

export function formatVaultAmount(value: bigint, decimals = 18): string {
  return formatUnits(value, decimals);
}

export function useVault() {
  const { address: account } = useAccount();
  const { address, disabledReason, missingDeployment } = useContractResolution("vault");
  const { writeContractAsync, ...writeState } = useWriteContract();

  const yieldHistory = useQuery({
    queryKey: ["agentService", "yieldHistory", account],
    enabled: Boolean(account),
    queryFn: async () => {
      if (!account) {
        throw new Error("Wallet is not connected.");
      }
      return getYieldHistory(account);
    },
    staleTime: 30_000
  });

  const latestPoint = yieldHistory.data?.[yieldHistory.data.length - 1];

  const ensureAddress = () => {
    const deployedAddress = address;
    if (!deployedAddress) {
      throw new Error(disabledReason ?? "Vault deployment is missing for current chain.");
    }
    return deployedAddress;
  };

  return {
    address,
    missingDeployment,
    disabledReason,
    getVaultState: latestPoint,
    getUserShare: latestPoint?.deposited ?? 0,
    yieldHistory,
    deposit: async (params: VaultActionInput) => {
      const deployedAddress = ensureAddress();
      return writeContractAsync({
        address: deployedAddress,
        abi: IYieldPoolAbi,
        functionName: "deposit",
        args: [params.beneficiary, params.amount, params.tokenId]
      });
    },
    withdraw: async (params: VaultActionInput) => {
      const deployedAddress = ensureAddress();
      return writeContractAsync({
        address: deployedAddress,
        abi: IYieldPoolAbi,
        functionName: "withdraw",
        args: [params.beneficiary, params.amount, params.tokenId]
      });
    },
    harvest: async (params: VaultActionInput & { toTokenId: bigint }) => {
      const deployedAddress = ensureAddress();
      return writeContractAsync({
        address: deployedAddress,
        abi: IYieldPoolAbi,
        functionName: "rebalance",
        args: [params.beneficiary, params.amount, params.tokenId, params.toTokenId]
      });
    },
    formatVaultAmount,
    computeEstimatedApy,
    writeState
  };
}
