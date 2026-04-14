import { Link } from "react-router-dom";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

function shortenHash(hash: string): string {
  if (!hash || hash.length < 12) {
    return hash;
  }
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export function OverviewPage({ data }: Props) {
  const activePolicies = data.policies.filter((policy) => policy.active).length;
  const verifiedProofs = data.activity.length;

  const routedValue = data.activity.reduce((total, row) => {
    const parsed = Number(row.amount);
    return Number.isFinite(parsed) ? total + parsed : total;
  }, 0);

  const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

  return (
    <>
      <section className="overview-hero panel">
        <div>
          <p className="eyebrow">Machine-Native Finance Control Plane</p>
          <h1 className="hero-title">Machine-native policy for autonomous agents.</h1>
          <p className="hero-subtext">
            Patricon secures strategy execution with ZK identity and policy proofs, now operating
            on HashKey Chain to support machine-native finance with verifiable controls.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/settlement">Launch console</Link>
            <a className="btn btn-secondary" href="https://github.com/SuryaSundarVadali/Patricon/tree/main/dashboard" target="_blank" rel="noreferrer">
              View docs
            </a>
          </div>
        </div>
        <aside className="network-status-panel">
          <h3>Network Status</h3>
          <div className="status-metric-grid">
            <article className="status-metric">
              <p className="stat-label">Active networks</p>
              <p className="stat-value">1</p>
            </article>
            <article className="status-metric">
              <p className="stat-label">Value routed</p>
              <p className="stat-value">{compact.format(routedValue)}</p>
            </article>
            <article className="status-metric">
              <p className="stat-label">Active agents</p>
              <p className="stat-value">{compact.format(data.agents.length)}</p>
            </article>
            <article className="status-metric">
              <p className="stat-label">Verified proofs</p>
              <p className="stat-value">{compact.format(verifiedProofs)}</p>
            </article>
          </div>
        </aside>
      </section>

      <section className="stripe-row">
        <article className="panel stripe-card">
          <p className="stat-label">For Agents</p>
          <h3>Secure autonomous strategy loops</h3>
          <p className="muted">
            Bind every agent to identity commitments and enforce policy versions before execution.
          </p>
        </article>
        <article className="panel stripe-card">
          <p className="stat-label">For Protocols</p>
          <h3>Verify proofs directly on-chain</h3>
          <p className="muted">
            Contracts consume proof outputs to validate policy alignment and block unsafe actions.
          </p>
        </article>
        <article className="panel stripe-card">
          <p className="stat-label">For Operations</p>
          <h3>Supervise agent behavior in real time</h3>
          <p className="muted">
            Operator dashboards expose activity, policy state, and settlement events for rapid triage.
          </p>
        </article>
      </section>

      <section className="panel two-col">
        <div>
          <h3>Network</h3>
          <p>Network: {data.deployment.network}</p>
          <p>Chain ID: {data.network.chainId}</p>
          <p>RPC Endpoint: {data.network.rpcUrl}</p>
          <p>Active Policies: {activePolicies}</p>
        </div>
        <div>
          <h3>Deployment</h3>
          <p>Policy Registry: {shortenHash(data.deployment.policyRegistry)}</p>
          <p>Agent Registry: {shortenHash(data.deployment.agentRegistry)}</p>
          <p>DeFi Adapter: {shortenHash(data.deployment.policyEnforcedDeFiAdapter)}</p>
          <p>Settlement Connector: {shortenHash(data.deployment.settlementConnector)}</p>
        </div>
      </section>
    </>
  );
}