import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePublicClient,
  useReadContract,
  useWatchContractEvent,
  useWriteContract
} from "wagmi";

import { PolicyRegistryAbi } from "../../generated/contracts";
import { measure } from "../../lib/profiling";
import { toFixedLengthSignals } from "../../lib/zk/proofUtils";
import { verifyPolicyProofLocally } from "../../lib/zk/policyProof";
import type { PolicyProofInput } from "../../lib/zk/zkTypes";
import { getContractAddress, VerifierPolicyAbi } from "../../lib/contracts";
import { usePolicyProofWorker } from "../usePolicyProofWorker";
import { useContractResolution } from "./common";

export type RegisterPolicyInput = {
  agent: `0x${string}`;
  policyHash: `0x${string}`;
  policyVersion: bigint;
  circuitVersion: bigint;
  active: boolean;
};

type VerifyPolicyAndAttachInput = {
  proofInput: PolicyProofInput;
  policyVersion: bigint;
  circuitVersion: bigint;
};

type VerifyPolicyAndRegisterInput = {
  proofInput: PolicyProofInput;
  agent: `0x${string}`;
  policyVersion: bigint;
  circuitVersion: bigint;
  active: boolean;
};

function toBytes32Hex(value: bigint): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

export function useZKPolicyRegistry(agent?: `0x${string}`) {
  const queryClient = useQueryClient();
  const {
    account,
    address,
    chainId,
    wrongNetwork,
    disabledReason,
    missingDeployment
  } = useContractResolution("zkPolicyRegistry");
  const publicClient = usePublicClient({ chainId });
  const policyWorker = usePolicyProofWorker();
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
      if (!account) {
        throw new Error("Wallet is not connected.");
      }
      if (wrongNetwork || missingDeployment) {
        throw new Error("Wrong network for PolicyRegistry contract deployment.");
      }
      const deployedAddress = address;
      if (!deployedAddress) {
        throw new Error(disabledReason ?? "Policy registry deployment missing.");
      }
      return deployedAddress;
    };

    return {
      registerPolicy: async (params: RegisterPolicyInput) => {
        const deployedAddress = ensureAddress();
        const { result } = await measure("contract.policyRegistry.register", async () => writeContractAsync({
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
        }));
        return result;
      },
      attachPolicyToAgent: async (policyHashValue: `0x${string}`, policyVersion: bigint, circuitVersion: bigint) => {
        const deployedAddress = ensureAddress();
        const { result } = await measure("contract.policyRegistry.attach", async () => writeContractAsync({
          address: deployedAddress,
          abi: PolicyRegistryAbi,
          functionName: "selfRegisterPolicy",
          args: [policyHashValue, policyVersion, circuitVersion]
        }));
        return result;
      },
      verifyPolicyProofAndAttach: async (params: VerifyPolicyAndAttachInput) => {
        const deployedAddress = ensureAddress();

        if (!publicClient) {
          throw new Error("Public client is unavailable for current chain.");
        }

        const verifierAddress = getContractAddress(chainId, "policyVerifier");
        if (!verifierAddress) {
          throw new Error("Policy verifier deployment is missing for current chain.");
        }

        const { result: generated, elapsedMs: proofTimeMs } = await measure("zk.flow.policy.worker", async () => policyWorker.generate(params.proofInput));

        const localVerified = await verifyPolicyProofLocally(generated.proof);
        if (!localVerified) {
          throw new Error("Policy proof did not pass local Groth16 verification.");
        }

        const policySignals = toFixedLengthSignals(
          generated.proof.publicSignals,
          14,
          "policy public signals"
        ) as [
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
        ];

        const verificationStartedAt = performance.now();
        const verifiedOnChain = await publicClient.readContract({
          address: verifierAddress,
          abi: VerifierPolicyAbi,
          functionName: "verifyProof",
          args: [generated.proof.proof.pA, generated.proof.proof.pB, generated.proof.proof.pC, policySignals]
        });
        const verificationTimeMs = performance.now() - verificationStartedAt;

        if (!verifiedOnChain) {
          throw new Error("Policy proof failed contract verifier precheck.");
        }

        const policyHashValue = toBytes32Hex(policySignals[2]);
        const { result: txHash, elapsedMs: writeMs } = await measure("contract.policyRegistry.writeWithProof", async () => writeContractAsync({
          address: deployedAddress,
          abi: PolicyRegistryAbi,
          functionName: "selfRegisterPolicy",
          args: [policyHashValue, params.policyVersion, params.circuitVersion]
        }));

        return {
          txHash,
          proofTimeMs,
          verificationTimeMs: verificationTimeMs + writeMs
        };
      },
      verifyPolicyProofAndRegister: async (params: VerifyPolicyAndRegisterInput) => {
        const deployedAddress = ensureAddress();

        if (!publicClient) {
          throw new Error("Public client is unavailable for current chain.");
        }

        const verifierAddress = getContractAddress(chainId, "policyVerifier");
        if (!verifierAddress) {
          throw new Error("Policy verifier deployment is missing for current chain.");
        }

        const { result: generated, elapsedMs: proofTimeMs } = await measure("zk.flow.policy.worker", async () => policyWorker.generate(params.proofInput));

        const localVerified = await verifyPolicyProofLocally(generated.proof);
        if (!localVerified) {
          throw new Error("Policy proof did not pass local Groth16 verification.");
        }

        const policySignals = toFixedLengthSignals(
          generated.proof.publicSignals,
          14,
          "policy public signals"
        ) as [
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
        ];

        const verificationStartedAt = performance.now();
        const verifiedOnChain = await publicClient.readContract({
          address: verifierAddress,
          abi: VerifierPolicyAbi,
          functionName: "verifyProof",
          args: [generated.proof.proof.pA, generated.proof.proof.pB, generated.proof.proof.pC, policySignals]
        });
        const verificationTimeMs = performance.now() - verificationStartedAt;

        if (!verifiedOnChain) {
          throw new Error("Policy proof failed contract verifier precheck.");
        }

        const policyHashValue = toBytes32Hex(policySignals[2]);
        const { result: txHash, elapsedMs: writeMs } = await measure("contract.policyRegistry.writeWithProof", async () => writeContractAsync({
          address: deployedAddress,
          abi: PolicyRegistryAbi,
          functionName: "registerOrUpdatePolicy",
          args: [params.agent, policyHashValue, params.policyVersion, params.circuitVersion, params.active]
        }));

        return {
          txHash,
          proofTimeMs,
          verificationTimeMs: verificationTimeMs + writeMs
        };
      }
    };
  }, [account, address, chainId, disabledReason, missingDeployment, policyWorker, publicClient, writeContractAsync, wrongNetwork]);

  return {
    address,
    missingDeployment,
    disabledReason,
    getPolicy: policy,
    getVerifyingKey: undefined,
    policyHash,
    paused,
    policyWorker,
    ...actions,
    writeState
  };
}
