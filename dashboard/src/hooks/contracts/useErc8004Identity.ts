import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReadContract,
  useReadContracts,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import { ERC8004IdentityRegistryAbi } from "../../generated/contracts";
import { addressEquals, useContractResolution } from "./common";

export type OwnerLookupArgs = {
  owner?: `0x${string}`;
  startId?: bigint;
  pageSize?: number;
};

export function deriveAgentIdentity(tokenId: bigint, tokenURI: string) {
  return {
    agentId: tokenId,
    agentURI: tokenURI
  };
}

export function useErc8004Identity(tokenId?: bigint, ownerLookup?: OwnerLookupArgs) {
  const queryClient = useQueryClient();
  const {
    account,
    address,
    chainId,
    disabledReason,
    missingDeployment
  } = useContractResolution("erc8004IdentityRegistry");
  const { writeContractAsync, ...writeState } = useWriteContract();

  const pageSize = ownerLookup?.pageSize ?? 20;
  const startId = ownerLookup?.startId ?? 1n;
  const lookupOwner = ownerLookup?.owner ?? account;

  const totalAgents = useReadContract({
    abi: ERC8004IdentityRegistryAbi,
    address,
    functionName: "totalAgents",
    query: {
      enabled: Boolean(address)
    }
  });

  const tokenUri = useReadContract({
    abi: ERC8004IdentityRegistryAbi,
    address,
    functionName: "tokenURI",
    args: tokenId ? [tokenId] : undefined,
    query: {
      enabled: Boolean(address && tokenId)
    }
  });

  const owner = useReadContract({
    abi: ERC8004IdentityRegistryAbi,
    address,
    functionName: "ownerOf",
    args: tokenId ? [tokenId] : undefined,
    query: {
      enabled: Boolean(address && tokenId)
    }
  });

  const ids = useMemo(() => {
    return Array.from({ length: pageSize }, (_, index) => startId + BigInt(index));
  }, [pageSize, startId]);

  const ownersPage = useReadContracts({
    contracts: address
      ? ids.map((id) => ({
          address,
          abi: ERC8004IdentityRegistryAbi,
          functionName: "ownerOf",
          args: [id]
        }))
      : undefined,
    query: {
      enabled: Boolean(address && lookupOwner)
    },
    allowFailure: true
  });

  const agentByOwner = useMemo(() => {
    if (!lookupOwner || !ownersPage.data) {
      return undefined;
    }

    const index = ownersPage.data.findIndex((item) => {
      const result = item.result as `0x${string}` | undefined;
      return addressEquals(result, lookupOwner);
    });

    return index >= 0 ? ids[index] : undefined;
  }, [ids, lookupOwner, ownersPage.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["erc8004Identity", chainId, tokenId, lookupOwner] });
  };

  useWatchContractEvent({
    address,
    abi: ERC8004IdentityRegistryAbi,
    eventName: "Registered",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: ERC8004IdentityRegistryAbi,
    eventName: "URIUpdated",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  const actions = useMemo(() => {
    const ensureAddress = () => {
      const deployedAddress = address;
      if (!deployedAddress) {
        throw new Error(disabledReason ?? "ERC-8004 identity registry deployment missing.");
      }
      return deployedAddress;
    };

    return {
      registerAgent: async (agentURI: string) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: ERC8004IdentityRegistryAbi,
          functionName: "register",
          args: [agentURI]
        });
      },
      updateAgentURI: async (agentId: bigint, newURI: string) => {
        const deployedAddress = ensureAddress();
        return writeContractAsync({
          address: deployedAddress,
          abi: ERC8004IdentityRegistryAbi,
          functionName: "setAgentURI",
          args: [agentId, newURI]
        });
      }
    };
  }, [address, disabledReason, writeContractAsync]);

  return {
    address,
    missingDeployment,
    disabledReason,
    getAgentURI: tokenUri,
    getAgentByOwner: agentByOwner,
    getOwner: owner,
    totalAgents,
    deriveAgentIdentity,
    ...actions,
    writeState
  };
}
