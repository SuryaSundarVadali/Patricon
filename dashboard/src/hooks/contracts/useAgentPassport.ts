import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePublicClient,
  useReadContract,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import { AgentRegistryAbi } from "../../generated/contracts";
import { toFixedLengthSignals } from "../../lib/zk/proofUtils";
import { verifyZkIdProofLocally } from "../../lib/zk/zkIdProof";
import type { ZkIdInput } from "../../lib/zk/zkTypes";
import { getContractAddress, VerifierIdentityAbi } from "../../lib/contracts";
import { useZkIdProofWorker } from "../useZkIdProofWorker";
import { useContractResolution } from "./common";

export type RegisterPassportInput = {
  agentType: `0x${string}`;
  didHash: `0x${string}`;
  publicKeyHash: `0x${string}`;
  identityCommitment: `0x${string}`;
  identityVersion: bigint;
};

type VerifyZkIdAndRegisterInput = {
  zkInput: ZkIdInput;
  registration: Omit<RegisterPassportInput, "identityCommitment">;
};

function toBytes32Hex(value: bigint): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

export function useAgentPassport(agentAddress?: `0x${string}`) {
  const queryClient = useQueryClient();
  const {
    account,
    address,
    chainId,
    disabledReason,
    missingDeployment
  } = useContractResolution("agentPassport");
  const publicClient = usePublicClient({ chainId });
  const zkIdWorker = useZkIdProofWorker();
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
      },
      verifyZkIdAndRegisterPassport: async (input: VerifyZkIdAndRegisterInput) => {
        const deployedAddress = ensureAddress();

        if (!publicClient) {
          throw new Error("Public client is unavailable for current chain.");
        }

        const verifierAddress = getContractAddress(chainId, "identityVerifier");
        if (!verifierAddress) {
          throw new Error("Identity verifier deployment is missing for current chain.");
        }

        const generated = await zkIdWorker.generate(input.zkInput);
        const proofTimeMs = generated.elapsedMs;

        const localVerified = await verifyZkIdProofLocally(generated.proof);
        if (!localVerified) {
          throw new Error("Identity proof did not pass local Groth16 verification.");
        }

        const identitySignals = toFixedLengthSignals(
          generated.proof.publicSignals,
          6,
          "identity public signals"
        ) as [bigint, bigint, bigint, bigint, bigint, bigint];

        const verificationStartedAt = performance.now();
        const verifiedOnChain = await publicClient.readContract({
          address: verifierAddress,
          abi: VerifierIdentityAbi,
          functionName: "verifyProof",
          args: [generated.proof.proof.pA, generated.proof.proof.pB, generated.proof.proof.pC, identitySignals]
        });
        const verificationTimeMs = performance.now() - verificationStartedAt;

        if (!verifiedOnChain) {
          throw new Error("Identity proof failed contract verifier precheck.");
        }

        const identityCommitment = toBytes32Hex(identitySignals[0]);

        const txHash = await writeContractAsync({
          address: deployedAddress,
          abi: AgentRegistryAbi,
          functionName: "selfRegisterAgent",
          args: [
            input.registration.agentType,
            input.registration.didHash,
            input.registration.publicKeyHash,
            identityCommitment,
            input.registration.identityVersion
          ]
        });

        return {
          txHash,
          proofTimeMs,
          verificationTimeMs
        };
      }
    };
  }, [address, chainId, disabledReason, publicClient, writeContractAsync, zkIdWorker]);

  return {
    address,
    missingDeployment,
    disabledReason,
    getPassport: passport,
    getPolicyHash: policyHash,
    linkedIdentityRegistry,
    identityMerkleRoot,
    zkIdWorker,
    ...actions,
    writeState
  };
}
