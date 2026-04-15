export type AgentAction = {
  tradeValue: bigint | number | string;
  jurisdiction: number;
  kycTier: number;
};

export type ProofLifecycleStatus = "idle" | "generating" | "verifying" | "verified" | "failed";

export type ProofStatus = {
  circuitName: string;
  status: ProofLifecycleStatus;
  generationTimeMs: number;
  txHash: string | null;
  publicSignals: string[];
  error: string | null;
};

export type CircuitInfo = {
  circuitName: string;
  constraints: number;
  wires: number;
  labels: number;
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
    throw new Error(`ZK API request failed (${response.status}) for ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function getZKStatus(agentAddress: string): Promise<ProofStatus[]> {
  try {
    return await fetchJson<ProofStatus[]>(`/api/zk/status?agent=${encodeURIComponent(agentAddress)}`);
  } catch {
    return [];
  }
}

export async function rerunZKCheck(agentAddress: string): Promise<void> {
  await fetchJson<{ ok: boolean }>("/api/zk/rerun", {
    method: "POST",
    body: JSON.stringify({ agentAddress })
  });
}

export async function getCircuitInfo(): Promise<CircuitInfo[]> {
  try {
    return await fetchJson<CircuitInfo[]>("/api/zk/circuit-info");
  } catch {
    return [];
  }
}
