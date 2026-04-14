import { useMemo, useState } from "react";
import { DataTable } from "../components/DataTable";
import { Icon } from "../icons/Icon";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function AgentsPage({ data }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "policy" | "diagnostics">("overview");

  const shorten = (value: string) => {
    if (!value || value === "-") {
      return value;
    }
    return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
  };

  const formatTime = (iso: string): string => {
    if (!iso) {
      return "No on-chain actions yet";
    }
    const time = Date.parse(iso);
    if (Number.isNaN(time)) {
      return "No on-chain actions yet";
    }
    return new Date(time).toLocaleString();
  };

  const now = Date.now();
  const in24h = (iso: string) => {
    const time = Date.parse(iso);
    if (Number.isNaN(time)) {
      return false;
    }
    return now - time <= 24 * 60 * 60 * 1000;
  };

  const policyByAgent = new Map(data.policies.map((policy) => [policy.agent.toLowerCase(), policy]));

  const agentRecords = useMemo(
    () =>
      data.agents.map((agent) => {
        const policy = policyByAgent.get(agent.agent.toLowerCase());
        const activity = data.activity.filter((item) => item.agent.toLowerCase() === agent.agent.toLowerCase());
        const recentActivity = activity.filter((item) => in24h(item.timestamp));
        const failed24h = recentActivity.filter((item) => item.txStatus !== "confirmed").length;
        const lastOnChain = activity[0]?.timestamp ?? "";

        const status = !agent.active
          ? "paused"
          : failed24h > 0
            ? "degraded"
            : recentActivity.length > 0
              ? "healthy"
              : "degraded";

        return {
          ...agent,
          role: agent.agentTypeHash === "0x0000000000000000000000000000000000000000000000000000000000000000"
            ? "yield-farming-agent"
            : "restaking-oracle-agent",
          policyVersion: policy?.policyVersion ?? 0,
          activity,
          recentActivity,
          failed24h,
          lastOnChain,
          actions24h: recentActivity.length,
          proofs24h: recentActivity.length,
          status,
          networks: activity.length > 0 ? [data.deployment.network] : []
        };
      }),
    [data.agents, data.activity, data.deployment.network, data.policies]
  );

  const rows = agentRecords.map((agent) => [
    <button className="table-link" key={`${agent.agent}-open`} onClick={() => setSelectedAgent(agent.agent)}>
      <Icon name="details" size={18} aria-hidden="true" />
      {shorten(agent.agent)}
    </button>,
    <span className={`account-badge ${agent.accountType === "Safe" ? "smart" : "eoa"}`} key={`${agent.agent}-account`}>
      <Icon name="wallet" size={16} aria-hidden="true" />
      {agent.accountType === "Safe" ? "Safe / ERC-4337" : "EOA"}
    </span>,
    agent.role,
    shorten(agent.didHash),
    `${shorten(agent.policyHash)} (v${agent.policyVersion || "-"})`,
    agent.networks.join(", ") || "Not active",
    formatTime(agent.lastOnChain),
    `${agent.actions24h} actions / ${agent.proofs24h} proofs`,
    <span className={`status-badge ${agent.status}`} key={`${agent.agent}-status`}>
      <Icon
        name={agent.status === "healthy" ? "success" : agent.status === "paused" ? "pause" : "warning"}
        size={16}
        aria-hidden="true"
      />
      {agent.status}
    </span>
  ]);

  const selected = selectedAgent
    ? agentRecords.find((agent) => agent.agent.toLowerCase() === selectedAgent.toLowerCase()) ?? null
    : null;

  return (
    <>
      {selected && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal glass-panel wide-modal" role="dialog" aria-modal="true" aria-label="Agent details">
            <h3>Agent Detail</h3>
            <p className="muted">Operator view for identity, policy, and machine activity diagnostics.</p>
            <p><strong>Agent account:</strong> {selected.agent}</p>

            <div className="tab-row">
              <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Overview</button>
              <button className={activeTab === "activity" ? "active" : ""} onClick={() => setActiveTab("activity")}>Activity</button>
              <button className={activeTab === "policy" ? "active" : ""} onClick={() => setActiveTab("policy")}>Policy</button>
              <button className={activeTab === "diagnostics" ? "active" : ""} onClick={() => setActiveTab("diagnostics")}>Diagnostics</button>
            </div>

            {activeTab === "overview" && (
              <div className="detail-grid">
                <p><strong>Agent role:</strong> {selected.role}</p>
                <p><strong>Account type:</strong> {selected.accountType === "Safe" ? "Safe / ERC-4337 smart account" : "EOA"}</p>
                <p><strong>Identity commitment / DID:</strong> {selected.didHash}</p>
                <p><strong>Bound policy hash:</strong> {selected.policyHash}</p>
                <p><strong>Policy version:</strong> {selected.policyVersion || "Unbound"}</p>
                <p><strong>Status:</strong> {selected.status}</p>
                <p><strong>Last on-chain action:</strong> {formatTime(selected.lastOnChain)}</p>
                <p><strong>Actions & proofs (24h):</strong> {selected.actions24h} / {selected.proofs24h}</p>
                <p><strong>Active network(s):</strong> {selected.networks.join(", ") || "Not active"}</p>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="detail-list">
                {selected.activity.length === 0 && <p className="muted">No recent DeFi actions recorded.</p>}
                {selected.activity.slice(0, 10).map((item) => (
                  <article className="detail-list-item" key={item.txHash}>
                    <p><strong>{item.actionType}</strong> on {item.poolOrAsset}</p>
                    <p className="muted">Decision: {item.txStatus} | Proof result: {item.proofStatus} | {new Date(item.timestamp).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "policy" && (
              <div className="detail-grid">
                <p><strong>Policy hash:</strong> {selected.policyHash}</p>
                <p><strong>Policy version:</strong> {selected.policyVersion || "Unbound"}</p>
                <p><strong>Max trade size:</strong> 25% of strategy allocation</p>
                <p><strong>Daily volume cap:</strong> 100 units (template default)</p>
                <p><strong>Allowed pools:</strong> Patricon configured pool list</p>
                <p><strong>Time window:</strong> 00:00-23:59 UTC</p>
                <p><strong>History:</strong> Last policy update inferred from recent execution windows</p>
              </div>
            )}

            {activeTab === "diagnostics" && (
              <div className="detail-grid">
                <p><strong>Raw proof/public signal access:</strong> Available per action from Activity view.</p>
                <p><strong>Last failure count (24h):</strong> {selected.failed24h}</p>
                <p><strong>Last action selector:</strong> {selected.lastAction}</p>
                <p><strong>Raw logs:</strong> Use tx hash drill-down in Activity tab for full payloads.</p>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedAgent(null)}>Close</button>
            </div>
          </section>
        </div>
      )}

      <DataTable
        title="Agents"
        description="Operations view for account type, identity binding, policy version, and health telemetry per autonomous agent."
        columns={[
          "Agent name",
          "Agent account",
          "Role / strategy",
          "Identity / DID",
          "Policy hash + version",
          "Network(s)",
          "Last on-chain action",
          "Actions / proofs (24h)",
          "Status"
        ]}
        rows={rows}
        emptyText="No agents yet. Register your first autonomous operator agent."
        emptyAction={<a className="btn btn-primary" href="#actions"><Icon name="plusSquare" size={18} aria-hidden="true" /> Register agent</a>}
      />
    </>
  );
}
