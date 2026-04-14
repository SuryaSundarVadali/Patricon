import { useMemo, useState } from "react";
import { DataTable } from "../components/DataTable";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function PoliciesPage({ data }: Props) {
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

  const shorten = (value: string) => (value.length > 16 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value);
  const now = Date.now();

  const policyRows = useMemo(
    () =>
      data.policies.map((policy) => {
        const relatedActivity = data.activity.filter((item) => item.agent.toLowerCase() === policy.agent.toLowerCase());
        const in24h = relatedActivity.filter((item) => {
          const ts = Date.parse(item.timestamp);
          return !Number.isNaN(ts) && now - ts <= 24 * 60 * 60 * 1000;
        });
        const rejected = in24h.filter((item) => item.txStatus !== "confirmed").length;
        const executed = in24h.filter((item) => item.txStatus === "confirmed").length;

        return {
          ...policy,
          policyName: `Conservative strategy policy v${policy.policyVersion}`,
          purpose: "Policy-gated autonomous portfolio actions",
          boundAgents: [policy.agent],
          mode: "Per-agent",
          maxTradeSize: "25% strategy allocation",
          dailyCap: "100 units",
          allowedPools: "Patricon configured pool set",
          timeWindow: "24h rolling window",
          statusFlag: policy.active ? "active" : "deprecated",
          attempted24h: in24h.length,
          rejected24h: rejected,
          executed24h: executed
        };
      }),
    [data.activity, data.policies, now]
  );

  const rows = policyRows.map((policy) => [
    <button className="table-link" key={`${policy.policyHash}-view`} onClick={() => setSelectedPolicy(policy.policyHash)}>
      {shorten(policy.policyHash)}
    </button>,
    policy.policyName,
    `${policy.purpose}`,
    `Policy v${policy.policyVersion}`,
    `Circuit v${policy.circuitVersion}`,
    `${policy.mode} (${policy.boundAgents.length} bound)`,
    `${policy.maxTradeSize} | ${policy.dailyCap}`,
    `${policy.allowedPools} | ${policy.timeWindow}`,
    <span className={`status-badge ${policy.statusFlag === "active" ? "healthy" : "paused"}`} key={`${policy.policyHash}-status`}>
      {policy.statusFlag}
    </span>
  ]);

  const selected = selectedPolicy
    ? policyRows.find((policy) => policy.policyHash === selectedPolicy) ?? null
    : null;

  return (
    <>
      {selected && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal glass-panel wide-modal" role="dialog" aria-modal="true" aria-label="Policy details">
            <h3>Policy Detail</h3>
            <p className="muted">Infrastructure-first policy profile with risk limits and proof metadata.</p>

            <div className="detail-grid">
              <p><strong>Policy hash:</strong> {selected.policyHash}</p>
              <p><strong>Policy name:</strong> {selected.policyName}</p>
              <p><strong>Status:</strong> {selected.statusFlag}</p>
              <p><strong>Circuit & version:</strong> policy v{selected.policyVersion} / circuit v{selected.circuitVersion}</p>
            </div>

            <h4>Risk Limits</h4>
            <div className="detail-grid">
              <p><strong>Max trade size:</strong> {selected.maxTradeSize}</p>
              <p><strong>Daily volume cap:</strong> {selected.dailyCap}</p>
            </div>

            <h4>Whitelisted Assets & Pools</h4>
            <div className="detail-grid">
              <p>{selected.allowedPools}</p>
            </div>

            <h4>Time & Frequency Controls</h4>
            <div className="detail-grid">
              <p><strong>Execution window:</strong> {selected.timeWindow}</p>
            </div>

            <h4>Circuit & Proof Metadata</h4>
            <div className="detail-grid">
              <p><strong>Bound agents:</strong> {selected.boundAgents.join(", ")}</p>
              <p><strong>Policy model:</strong> {selected.mode}</p>
            </div>

            <h4>Simulation Summary (Last 24h)</h4>
            <div className="detail-grid">
              <p><strong>Trades attempted:</strong> {selected.attempted24h}</p>
              <p><strong>Rejected by policy:</strong> {selected.rejected24h}</p>
              <p><strong>Executed:</strong> {selected.executed24h}</p>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedPolicy(null)}>Close</button>
            </div>
          </section>
        </div>
      )}

      <DataTable
        title="Policies"
        description="Policy infrastructure view inspired by oracle-grade operations consoles: versions, circuit metadata, bindings, and risk controls."
        columns={[
          "Policy ID / hash",
          "Policy name",
          "Purpose",
          "Policy version",
          "Circuit version",
          "Binding model",
          "Risk limits",
          "Pools / time controls",
          "Status"
        ]}
        rows={rows}
        emptyText="No policy entries found. Add or update a policy to enforce operational limits."
        emptyAction={<a className="btn btn-secondary" href="#actions">Update policy</a>}
      />
    </>
  );
}
