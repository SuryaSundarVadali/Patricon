import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePublicClient,
  useReadContract,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import { AgentRegistryAbi } from "../../generated/contracts";
import { measure } from "../../lib/profiling";
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
    wrongNetwork,
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
      if (!account) {
        throw new Error("Wallet is not connected.");
      }
      if (wrongNetwork || missingDeployment) {
        throw new Error("Wrong network for AgentPassport contract deployment.");
      }
      const deployedAddress = address;
      if (!deployedAddress) {
        throw new Error(disabledReason ?? "Agent registry deployment missing.");
      }
      return deployedAddress;
    };

    return {
      registerPassport: async (params: RegisterPassportInput) => {
        const deployedAddress = ensureAddress();
        const { result } = await measure("contract.agentPassport.registerPassport", async () => writeContractAsync({
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
        }));
        return result;
      },
      updatePolicyWithProof: async (identityRegistry: `0x${string}`, erc8004AgentId: bigint) => {
        const deployedAddress = ensureAddress();
        const { result } = await measure("contract.agentPassport.linkIdentity", async () => writeContractAsync({
          address: deployedAddress,
          abi: AgentRegistryAbi,
          functionName: "linkERC8004Identity",
          args: [identityRegistry, erc8004AgentId]
        }));
        return result;
      },
      revokePassport: async (agent: `0x${string}`) => {
        const deployedAddress = ensureAddress();
        const { result } = await measure("contract.agentPassport.revoke", async () => writeContractAsync({
          address: deployedAddress,
          abi: AgentRegistryAbi,
          functionName: "setAgentStatus",
          args: [agent, 3]
        }));
        return result;
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

        const { result: generated, elapsedMs: proofTimeMs } = await measure("zk.flow.identity.worker", async () => zkIdWorker.generate(input.zkInput));

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

        const { result: txHash, elapsedMs: writeMs } = await measure("contract.agentPassport.writeWithProof", async () => writeContractAsync({
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
        }));

        return {
          txHash,
          proofTimeMs,
          verificationTimeMs: verificationTimeMs + writeMs
        };
      }
    };
  }, [account, address, chainId, disabledReason, missingDeployment, publicClient, writeContractAsync, wrongNetwork, zkIdWorker]);

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
