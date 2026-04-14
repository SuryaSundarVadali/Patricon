import { useState } from "react";
import { DataTable } from "../components/DataTable";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

type DetailItem = {
  txHash: string;
  gasUsed: string;
  raw: Record<string, string>;
};

export function ProofsPage({ data }: Props) {
  const [selected, setSelected] = useState<DetailItem | null>(null);
  const [agentFilter, setAgentFilter] = useState("all");
  const [policyFilter, setPolicyFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("24h");
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);

  const shorten = (value: string) => `${value.slice(0, 8)}...${value.slice(-6)}`;
  const now = Date.now();
  const policyByAgent = new Map(data.policies.map((policy) => [policy.agent.toLowerCase(), policy]));

  const prepared = data.activity.map((item) => {
    const policy = policyByAgent.get(item.agent.toLowerCase());
    const decision = item.txStatus !== "confirmed" ? "failed" : item.proofStatus.includes("✓") ? "accepted" : "rejected";
    const ts = Date.parse(item.timestamp);
    const hoursAgo = Number.isNaN(ts) ? Infinity : (now - ts) / (60 * 60 * 1000);
    return {
      ...item,
      policyHash: policy?.policyHash ?? "-",
      policyVersion: policy?.policyVersion ?? 0,
      proofType: item.actionType === "settlement" ? "combined" : "policy",
      circuitVersion: policy?.circuitVersion ?? 1,
      decision,
      network: data.deployment.network,
      hoursAgo,
      anomaly: item.txStatus !== "confirmed" || Number(item.gasUsed) > 600000
    };
  });

  const filtered = prepared.filter((item) => {
    if (agentFilter !== "all" && item.agent !== agentFilter) {
      return false;
    }
    if (policyFilter !== "all" && item.policyHash !== policyFilter) {
      return false;
    }
    if (resultFilter !== "all" && item.decision !== resultFilter) {
      return false;
    }
    if (networkFilter !== "all" && item.network !== networkFilter) {
      return false;
    }
    if (actionFilter !== "all" && item.actionType !== actionFilter) {
      return false;
    }

    if (timeFilter === "24h" && item.hoursAgo > 24) {
      return false;
    }
    if (timeFilter === "7d" && item.hoursAgo > 24 * 7) {
      return false;
    }
    if (timeFilter === "30d" && item.hoursAgo > 24 * 30) {
      return false;
    }

    if (anomaliesOnly && !item.anomaly) {
      return false;
    }

    return true;
  });

  const rows = filtered.map((item) => [
    item.actionType,
    <span className="row-with-badge" key={`${item.txHash}-agent`}>
      {shorten(item.agent)}
      <span className={`account-badge ${data.agents.find((agent) => agent.agent.toLowerCase() === item.agent.toLowerCase())?.accountType === "Safe" ? "smart" : "eoa"}`}>
        {data.agents.find((agent) => agent.agent.toLowerCase() === item.agent.toLowerCase())?.accountType === "Safe" ? "Safe / ERC-4337" : "EOA"}
      </span>
    </span>,
    `${shorten(item.policyHash)} (v${item.policyVersion || "-"})`,
    `${item.proofType} / circuit v${item.circuitVersion}`,
    <span className="proof-pill" key={`${item.txHash}-proof`}>
      {item.decision}
    </span>,
    shorten(item.txHash),
    item.network,
    item.gasUsed,
    item.timestamp ? new Date(item.timestamp).toLocaleString() : "-",
    <button
      key={`${item.txHash}-details`}
      className="table-link"
      onClick={() =>
        setSelected({
          txHash: item.txHash,
          gasUsed: item.gasUsed,
          raw: {
            actionType: item.actionType,
            agent: item.agent,
            poolOrAsset: item.poolOrAsset,
            amount: item.amount,
            proofStatus: item.proofStatus,
            txStatus: item.txStatus
          }
        })
      }
    >
      View raw data
    </button>
  ]);

  const uniqueAgents = Array.from(new Set(prepared.map((item) => item.agent)));
  const uniquePolicies = Array.from(new Set(prepared.map((item) => item.policyHash).filter((value) => value && value !== "-")));
  const uniqueActions = Array.from(new Set(prepared.map((item) => item.actionType)));

  return (
    <>
      {selected && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal glass-panel" role="dialog" aria-modal="true" aria-label="Proof details">
            <h3>Diagnostics: Raw Proof & Signal Data</h3>
            <p className="muted">Low-level payload exposed for advanced operator debugging only.</p>
            <p>Transaction: {selected.txHash}</p>
            <p>Gas used: {selected.gasUsed}</p>
            <div className="detail-grid">
              {Object.entries(selected.raw).map(([key, value]) => (
                <p key={key}><strong>{key}:</strong> {value}</p>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="panel filter-grid">
        <h3>Filters</h3>
        <label>
          Agent
          <select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
            <option value="all">All</option>
            {uniqueAgents.map((value) => (
              <option value={value} key={value}>{shorten(value)}</option>
            ))}
          </select>
        </label>
        <label>
          Policy
          <select value={policyFilter} onChange={(event) => setPolicyFilter(event.target.value)}>
            <option value="all">All</option>
            {uniquePolicies.map((value) => (
              <option value={value} key={value}>{shorten(value)}</option>
            ))}
          </select>
        </label>
        <label>
          Proof result
          <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label>
          Network
          <select value={networkFilter} onChange={(event) => setNetworkFilter(event.target.value)}>
            <option value="all">All</option>
            <option value={data.deployment.network}>{data.deployment.network}</option>
          </select>
        </label>
        <label>
          Action type
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="all">All</option>
            {uniqueActions.map((value) => (
              <option value={value} key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Time window
          <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={anomaliesOnly} onChange={(event) => setAnomaliesOnly(event.target.checked)} />
          Anomalies only (failed proofs, reverts, gas outliers)
        </label>
      </section>

      <DataTable
        title="Activity / Proofs"
        description="Machine-native audit trail for continuously acting agents and proof-gated decisions."
        columns={[
          "Action",
          "Agent + account",
          "Policy hash + version",
          "Proof type / circuit",
          "Decision",
          "Tx hash",
          "Network",
          "Gas",
          "Timestamp",
          "Diagnostics"
        ]}
        rows={rows}
        emptyText="No machine actions found for this filter set."
        emptyAction={<a className="btn btn-primary" href="#actions">Execute settlement</a>}
      />
    </>
  );
}
