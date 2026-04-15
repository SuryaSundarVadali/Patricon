export type AgentActionType = "DEPOSIT" | "WITHDRAW" | "REBALANCE" | "PAYMENT";

export type PendingAction = {
  id: string;
  type: AgentActionType;
  protocol: string;
  asset: string;
  amount: string;
  estimatedGas: string;
  proofRequired: boolean;
  policyCurrent: number;
  policyLimit: number;
};

export type ActionHistoryRow = {
  id: string;
  timestamp: string;
  type: AgentActionType;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED" | "FAILED";
  txHash?: `0x${string}`;
  validationRef?: string;
};

export type AgentOverview = {
  agentAddress: `0x${string}`;
  agentId?: bigint;
  registrationUri?: string;
  passportStatus: "NONE" | "ACTIVE" | "REVOKED";
};

export type AgentState = {
  overview: AgentOverview;
  pendingActions: PendingAction[];
  history: ActionHistoryRow[];
};

export type YieldPoint = {
  timestamp: string;
  deposited: number;
  currentValue: number;
  rewards: number;
};

export type TrustAggregate = {
  averageScore: number;
};

export type GlobalStats = {
  tvlUsd: number;
  averageReputation: number;
};

const defaultBase = "http://localhost:8787";

function getAgentServiceBaseUrl(): string {
  const value = import.meta.env.VITE_AGENT_SERVICE_BASE_URL as string | undefined;
  return value && value.trim().length > 0 ? value : defaultBase;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getAgentServiceBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Agent service request failed (${response.status}) for ${path}`);
  }

  return response.json() as Promise<T>;
}

function fallbackAgentState(agentAddress: `0x${string}`): AgentState {
  return {
    overview: {
      agentAddress,
      passportStatus: "NONE"
    },
    pendingActions: [],
    history: []
  };
}

export async function getGlobalStats(): Promise<GlobalStats> {
  try {
    return await fetchJson<GlobalStats>("/api/v1/metrics/global");
  } catch {
    return {
      tvlUsd: 0,
      averageReputation: 0
    };
  }
}

export async function getYieldHistory(agentAddress: `0x${string}`): Promise<YieldPoint[]> {
  try {
    return await fetchJson<YieldPoint[]>(`/api/v1/agents/${agentAddress}/yield`);
  } catch {
    return [];
  }
}

export async function getAgentState(agentAddress: `0x${string}`): Promise<AgentState> {
  try {
    return await fetchJson<AgentState>(`/api/v1/agents/${agentAddress}/state`);
  } catch {
    return fallbackAgentState(agentAddress);
  }
}

export async function approveAction(
  agentAddress: `0x${string}`,
  actionId: string,
  payload: {
    proof?: {
      pA: [string, string];
      pB: [[string, string], [string, string]];
      pC: [string, string];
      publicSignals: string[];
    };
    tags?: string[];
  }
): Promise<{ requestId: string }> {
  return fetchJson<{ requestId: string }>(`/api/v1/agents/${agentAddress}/actions/${actionId}/approve`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function rejectAction(
  agentAddress: `0x${string}`,
  actionId: string,
  reason: string,
  tags?: string[]
): Promise<{ requestId: string }> {
  return fetchJson<{ requestId: string }>(`/api/v1/agents/${agentAddress}/actions/${actionId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason, tags })
  });
}

export async function getTrustAggregate(agentId: bigint): Promise<TrustAggregate> {
  try {
    return await fetchJson<TrustAggregate>(`/api/v1/trust/${agentId.toString()}/aggregate`);
  } catch {
    return { averageScore: 0 };
  }
}
