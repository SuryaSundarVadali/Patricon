import { useQuery } from "@tanstack/react-query";

import { getAgentState, type AgentState } from "../../lib/api/agentService";

export function useAgentState(agentAddress?: `0x${string}`) {
  return useQuery<AgentState>({
    queryKey: ["agentService", "state", agentAddress],
    enabled: Boolean(agentAddress),
    queryFn: async () => {
      if (!agentAddress) {
        throw new Error("Agent address is required.");
      }
      return getAgentState(agentAddress);
    },
    staleTime: 15_000
  });
}
