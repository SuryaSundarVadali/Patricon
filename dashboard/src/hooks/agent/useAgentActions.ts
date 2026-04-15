import { useMutation, useQueryClient } from "@tanstack/react-query";

import { approveAction, rejectAction } from "../../lib/api/agentService";

export function useAgentActions(agentAddress?: `0x${string}`) {
  const queryClient = useQueryClient();

  const approve = useMutation({
    mutationFn: async (params: {
      actionId: string;
      proof?: {
        pA: [string, string];
        pB: [[string, string], [string, string]];
        pC: [string, string];
        publicSignals: string[];
      };
      tags?: string[];
    }) => {
      if (!agentAddress) {
        throw new Error("Wallet is not connected.");
      }
      return approveAction(agentAddress, params.actionId, {
        proof: params.proof,
        tags: params.tags
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agentService", "state", agentAddress] });
    }
  });

  const reject = useMutation({
    mutationFn: async (params: {
      actionId: string;
      reason: string;
      tags?: string[];
    }) => {
      if (!agentAddress) {
        throw new Error("Wallet is not connected.");
      }
      return rejectAction(agentAddress, params.actionId, params.reason, params.tags);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agentService", "state", agentAddress] });
    }
  });

  return {
    approveAction: approve.mutateAsync,
    rejectAction: reject.mutateAsync,
    approving: approve.isPending,
    rejecting: reject.isPending
  };
}
