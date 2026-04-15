import { useEffect, useMemo, useState } from "react";

import {
  getCircuitInfo,
  getZKStatus,
  rerunZKCheck,
  type AgentAction,
  type CircuitInfo,
  type ProofLifecycleStatus,
  type ProofStatus
} from "../api/zkApi";

type ZKProofStatusProps = {
  agentAddress: string;
  lastAction: AgentAction | null;
};

type ProofDetail = {
  circuitName: string;
  generationTimeMs: number;
  txHash: string | null;
  publicSignals: string[];
  error: string | null;
  status: ProofLifecycleStatus;
};

function shortenError(input: string | null): string {
  if (!input) return "";
  if (input.length <= 60) return input;
  return `${input.slice(0, 60)}...`;
}

function toDisplayStatus(detail: ProofDetail): string {
  switch (detail.status) {
    case "generating":
      return "Generating";
    case "verifying":
      return "Verifying";
    case "verified":
      return "Verified";
    case "failed":
      return "Failed";
    default:
      return "Idle";
  }
}

function statusCell(detail: ProofDetail) {
  if (detail.status === "generating") {
    return (
      <span className="zk-status zk-status-generating">
        <span className="zk-spinner" /> 🟡 Generating
      </span>
    );
  }

  if (detail.status === "verifying") {
    return (
      <span className="zk-status zk-status-verifying">
        <span className="zk-pulse" /> 🔵 Verifying
      </span>
    );
  }

  if (detail.status === "verified") {
    return <span className="zk-status zk-status-verified">✅ Verified</span>;
  }

  if (detail.status === "failed") {
    return (
      <span className="zk-status zk-status-failed" title={detail.error ?? "Unknown error"}>
        ❌ Failed {detail.error ? `- ${shortenError(detail.error)}` : ""}
      </span>
    );
  }

  return <span className="zk-status">Idle</span>;
}

const FALLBACK_CIRCUITS = ["agent_policy", "kyc_threshold", "jurisdiction_check"] as const;

export function ZKProofStatus({ agentAddress, lastAction }: ZKProofStatusProps) {
  const [proofStatus, setProofStatus] = useState<ProofLifecycleStatus>("idle");
  const [proofDetails, setProofDetails] = useState<ProofDetail[]>([]);
  const [circuitInfo, setCircuitInfo] = useState<CircuitInfo[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingCircuitInfo, setIsLoadingCircuitInfo] = useState(true);
  const [isRerunPending, setIsRerunPending] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  const circuitInfoMap = useMemo(() => {
    return new Map(circuitInfo.map((item) => [item.circuitName, item]));
  }, [circuitInfo]);

  useEffect(() => {
    let active = true;

    async function loadCircuitInfo() {
      setIsLoadingCircuitInfo(true);
      const data = await getCircuitInfo();
      if (!active) return;
      setCircuitInfo(data);
      setIsLoadingCircuitInfo(false);
    }

    void loadCircuitInfo();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!lastAction) return;
    if (!agentAddress) return;

    let active = true;

    async function loadStatus() {
      setIsLoadingStatus(true);
      setProofStatus("generating");
      const statusRows = await getZKStatus(agentAddress);
      if (!active) return;

      const normalized: ProofDetail[] = statusRows.map((row: ProofStatus) => ({
        circuitName: row.circuitName,
        generationTimeMs: row.generationTimeMs,
        txHash: row.txHash,
        publicSignals: row.publicSignals,
        error: row.error,
        status: row.status
      }));

      setProofDetails(normalized);

      if (normalized.some((row) => row.status === "failed")) {
        setProofStatus("failed");
      } else if (normalized.every((row) => row.status === "verified")) {
        setProofStatus("verified");
      } else if (normalized.some((row) => row.status === "verifying")) {
        setProofStatus("verifying");
      } else if (normalized.some((row) => row.status === "generating")) {
        setProofStatus("generating");
      } else {
        setProofStatus("idle");
      }

      setIsLoadingStatus(false);
    }

    void loadStatus();
    return () => {
      active = false;
    };
  }, [agentAddress, lastAction]);

  async function handleRerun() {
    if (!agentAddress) return;
    setIsRerunPending(true);
    setRerunError(null);

    try {
      await rerunZKCheck(agentAddress);
      setProofStatus("generating");
      const rows = await getZKStatus(agentAddress);
      const normalized: ProofDetail[] = rows.map((row) => ({
        circuitName: row.circuitName,
        generationTimeMs: row.generationTimeMs,
        txHash: row.txHash,
        publicSignals: row.publicSignals,
        error: row.error,
        status: row.status
      }));
      setProofDetails(normalized);
    } catch (error) {
      setRerunError(error instanceof Error ? error.message : "Failed to rerun ZK check.");
    } finally {
      setIsRerunPending(false);
    }
  }

  return (
    <section className="app-card" style={{ marginTop: "1rem" }}>
      <div className="app-inline" style={{ justifyContent: "space-between" }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>ZK Proof Status</h2>
        <button
          className="app-btn"
          type="button"
          onClick={() => void handleRerun()}
          disabled={isRerunPending || !agentAddress}
        >
          {isRerunPending ? "Re-running..." : "Re-run ZK Check"}
        </button>
      </div>
      <p className="app-hint" style={{ marginTop: "0.5rem" }}>
        Current aggregate status: <strong>{proofStatus}</strong>
      </p>
      {rerunError ? <p className="app-hint" style={{ color: "#b42318" }}>{rerunError}</p> : null}

      {isLoadingStatus ? (
        <div className="zk-skeleton-list">
          <div className="zk-skeleton-row" />
          <div className="zk-skeleton-row" />
          <div className="zk-skeleton-row" />
        </div>
      ) : (
        <table className="app-table" style={{ marginTop: "0.75rem" }}>
          <thead>
            <tr>
              <th>Circuit</th>
              <th>Status</th>
              <th>Generation Time</th>
              <th>Public Signals</th>
              <th>Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {(proofDetails.length > 0 ? proofDetails : FALLBACK_CIRCUITS.map((name) => ({
              circuitName: name,
              generationTimeMs: 0,
              txHash: null,
              publicSignals: [],
              error: null,
              status: "idle" as ProofLifecycleStatus
            }))).map((detail) => (
              <tr key={detail.circuitName}>
                <td>
                  <div>{detail.circuitName}</div>
                  {!isLoadingCircuitInfo ? (
                    <small className="app-hint">
                      Constraints: {circuitInfoMap.get(detail.circuitName)?.constraints ?? "-"}
                    </small>
                  ) : (
                    <small className="app-hint">Loading constraints...</small>
                  )}
                </td>
                <td>{statusCell(detail)}</td>
                <td>{detail.generationTimeMs > 0 ? `${detail.generationTimeMs} ms` : "-"}</td>
                <td>{detail.publicSignals.length > 0 ? detail.publicSignals.join(", ") : "-"}</td>
                <td>
                  {detail.status === "verified" && detail.txHash ? (
                    <a href={`https://hashkey.blockscout.com/tx/${detail.txHash}`} target="_blank" rel="noreferrer">
                      {detail.txHash.slice(0, 10)}...
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!isLoadingStatus && proofDetails.length > 0 ? (
        <div className="app-inline" style={{ marginTop: "0.75rem" }}>
          {proofDetails.map((detail) => (
            <span key={`${detail.circuitName}-${detail.status}`} className="app-hint">
              {detail.circuitName}: {toDisplayStatus(detail)}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default ZKProofStatus;
