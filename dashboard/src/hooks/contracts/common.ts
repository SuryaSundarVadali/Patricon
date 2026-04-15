import { useMemo } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import {
  getContractAddress,
  normalizeAddress,
  type ContractKey
} from "../../lib/contracts";
import { hashkeyTestnet } from "../../web3/config";

export type ContractResolution = {
  chainId: number;
  address?: `0x${string}`;
  isConnected: boolean;
  account?: `0x${string}`;
  wrongNetwork: boolean;
  missingDeployment: boolean;
  disabledReason?: string;
  switchToHashkeyTestnet: () => Promise<void>;
};

export function useContractResolution(key: ContractKey): ContractResolution {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const resolvedAddress = getContractAddress(chainId, key);
  const missingDeployment = !resolvedAddress;

  const disabledReason = useMemo(() => {
    if (!isConnected) {
      return "Wallet is not connected.";
    }
    if (missingDeployment) {
      return `Contract ${key} is not deployed for chain ${chainId}.`;
    }
    return undefined;
  }, [chainId, isConnected, key, missingDeployment]);

  return {
    chainId,
    address: resolvedAddress,
    isConnected,
    account: address,
    wrongNetwork: isConnected && missingDeployment,
    missingDeployment,
    disabledReason,
    switchToHashkeyTestnet: async () => {
      await switchChainAsync({ chainId: hashkeyTestnet.id });
    }
  };
}

export function addressEquals(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) {
    return false;
  }
  return normalizeAddress(a) === normalizeAddress(b);
}
