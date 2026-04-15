import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAccount,
  useReadContract,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import { ERC8004ValidationRegistryAbi } from "../../generated/contracts";
import { measure } from "../../lib/profiling";
import { useContractResolution } from "./common";

export type ValidationRequestInput = {
  validatorAddress: `0x${string}`;
  agentId: bigint;
  proofURI: string;
  proofHash: `0x${string}`;
};

export type ValidationResponseInput = {
  requestHash: `0x${string}`;
  result: number;
  responseURI: string;
  responseHash: `0x${string}`;
  tag: string;
};

export function buildRecordValidationWriteCall(address: `0x${string}`, params: ValidationRequestInput) {
  return {
    address,
    abi: ERC8004ValidationRegistryAbi,
    functionName: "validationRequest" as const,
    args: [params.validatorAddress, params.agentId, params.proofURI, params.proofHash]
  };
}

export function buildValidationResponseWriteCall(address: `0x${string}`, params: ValidationResponseInput) {
  return {
    address,
    abi: ERC8004ValidationRegistryAbi,
    functionName: "validationResponse" as const,
    args: [params.requestHash, params.result, params.responseURI, params.responseHash, params.tag]
  };
}

export function useErc8004Validation(agentId?: bigint, requestHash?: `0x${string}`) {
  const queryClient = useQueryClient();
  const { address: accountAddress } = useAccount();
  const {
    address,
    chainId,
    wrongNetwork,
    disabledReason,
    missingDeployment
  } = useContractResolution("erc8004ValidationRegistry");
  const { writeContractAsync, ...writeState } = useWriteContract();

  const validations = useReadContract({
    abi: ERC8004ValidationRegistryAbi,
    address,
    functionName: "getAgentValidations",
    args: agentId ? [agentId] : undefined,
    query: {
      enabled: Boolean(address && agentId)
    }
  });

  const latestValidationHash = useMemo(() => {
    const hashes = validations.data as `0x${string}`[] | undefined;
    if (!hashes || hashes.length === 0) {
      return undefined;
    }
    return hashes[hashes.length - 1];
  }, [validations.data]);

  const selectedRequestHash = requestHash ?? latestValidationHash;

  const validation = useReadContract({
    abi: ERC8004ValidationRegistryAbi,
    address,
    functionName: "getValidationStatus",
    args: selectedRequestHash ? [selectedRequestHash] : undefined,
    query: {
      enabled: Boolean(address && selectedRequestHash)
    }
  });

  const validatorRequests = useReadContract({
    abi: ERC8004ValidationRegistryAbi,
    address,
    functionName: "getValidatorRequests",
    args: accountAddress ? [accountAddress] : undefined,
    query: {
      enabled: Boolean(address && accountAddress)
    }
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["erc8004Validation", chainId, agentId, selectedRequestHash] });
  };

  useWatchContractEvent({
    address,
    abi: ERC8004ValidationRegistryAbi,
    eventName: "ValidationRequest",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  useWatchContractEvent({
    address,
    abi: ERC8004ValidationRegistryAbi,
    eventName: "ValidationResponse",
    enabled: Boolean(address),
    onLogs: invalidate
  });

  const actions = useMemo(() => {
    const ensureAddress = () => {
      if (!accountAddress) {
        throw new Error("Wallet is not connected.");
      }
      if (wrongNetwork || missingDeployment) {
        throw new Error("Wrong network for ERC-8004 validation contract deployment.");
      }
      const deployedAddress = address;
      if (!deployedAddress) {
        throw new Error(disabledReason ?? "ERC-8004 validation registry deployment missing.");
      }
      return deployedAddress;
    };

    return {
      recordValidation: async (params: ValidationRequestInput) => {
        const deployedAddress = ensureAddress();
        const { result } = await measure("erc8004.validation.record", async () => writeContractAsync(buildRecordValidationWriteCall(deployedAddress, params)));
        return result;
      },
      submitValidationResponse: async (params: ValidationResponseInput) => {
        const deployedAddress = ensureAddress();
        const { result } = await measure("erc8004.validation.respond", async () => writeContractAsync(buildValidationResponseWriteCall(deployedAddress, params)));
        return result;
      }
    };
  }, [accountAddress, address, disabledReason, missingDeployment, writeContractAsync, wrongNetwork]);

  return {
    address,
    missingDeployment,
    disabledReason,
    agentValidations: validations,
    getValidation: validation,
    getLatestValidation: {
      hash: latestValidationHash,
      record: validation
    },
    validatorRequests,
    ...actions,
    writeState
  };
}
