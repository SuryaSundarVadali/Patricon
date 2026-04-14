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

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function sparkline(values: number[]): string {
  if (values.length === 0) {
    return "";
  }

  const bars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const max = Math.max(...values, 1);
  return values
    .map((value) => {
      const index = Math.min(bars.length - 1, Math.floor((value / max) * (bars.length - 1)));
      return bars[index];
    })
    .join("");
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isWithinHours(iso: string, hours: number): boolean {
  if (!iso) {
    return false;
  }
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    return false;
  }
  return Date.now() - time <= hours * 60 * 60 * 1000;
}

function isWithinDays(iso: string, days: number): boolean {
  if (!iso) {
    return false;
  }
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    return false;
  }
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

export function OverviewPage({ data }: Props) {
  const now = new Date();
  const activePolicies = data.policies.filter((policy) => policy.active).length;
  const totalAgents = data.agents.length;
  const totalProofs = data.activity.length;
  const proofs24h = data.activity.filter((row) => isWithinHours(row.timestamp, 24)).length;
  const failedProofs24h = data.activity.filter(
    (row) => isWithinHours(row.timestamp, 24) && row.txStatus !== "confirmed"
  ).length;

  const activeAgents24h = data.agents.filter((agent) =>
    data.activity.some((row) => row.agent.toLowerCase() === agent.agent.toLowerCase() && isWithinHours(row.timestamp, 24))
  ).length;

  const updatedPolicies7d = data.policies.filter((policy) =>
    data.activity.some(
      (row) =>
        row.agent.toLowerCase() === policy.agent.toLowerCase() &&
        isWithinDays(row.timestamp, 7)
    )
  ).length;

  const valueGuarded = data.activity.reduce((total, row) => {
    const parsed = Number(row.amount);
    return Number.isFinite(parsed) ? total + parsed : total;
  }, 0);

  const networksConfigured = data.deployment.network ? 1 : 0;
  const adaptersConfigured = [data.deployment.policyEnforcedDeFiAdapter].filter((value) => value && value !== "0x0000000000000000000000000000000000000000").length;
  const connectorsConfigured = [data.deployment.settlementConnector].filter((value) => value && value !== "0x0000000000000000000000000000000000000000").length;

  const sixDaySeries = Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - index));
    const dayStart = startOfDay(day);
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return data.activity.filter((row) => {
      const time = Date.parse(row.timestamp);
      return !Number.isNaN(time) && time >= dayStart && time < dayEnd;
    }).length;
  });

  const metricCards = [
    {
      label: "Total agents registered",
      value: formatCompact(totalAgents),
      caption: "Agent accounts bound to on-chain identity and policy controls.",
      trend: sparkline(sixDaySeries)
    },
    {
      label: "Active agents (24h)",
      value: formatCompact(activeAgents24h),
      caption: "Agents that executed at least one on-chain action in the last day.",
      trend: sparkline(sixDaySeries)
    },
    {
      label: "Active policies",
      value: formatCompact(activePolicies),
      caption: "Policies currently enforceable for strategy execution.",
      trend: sparkline(sixDaySeries)
    },
    {
      label: "Policies updated (7d)",
      value: formatCompact(updatedPolicies7d),
      caption: "Policies observed with recent agent activity in the last week.",
      trend: sparkline(sixDaySeries)
    },
    {
      label: "Total proofs verified",
      value: formatCompact(totalProofs),
      caption: "Historical proof-backed actions accepted by the protocol.",
      trend: sparkline(sixDaySeries)
    },
    {
      label: "Proofs per 24h",
      value: formatCompact(proofs24h),
      caption: "Throughput of policy-gated machine actions in the last day.",
      trend: sparkline(sixDaySeries)
    },
    {
      label: "Failed proofs (24h)",
      value: formatCompact(failedProofs24h),
      caption: "Actions that failed or reverted during proof-gated execution.",
      trend: sparkline(sixDaySeries)
    },
    {
      label: "Networks / Adapters / Connectors",
      value: `${networksConfigured} / ${adaptersConfigured} / ${connectorsConfigured}`,
      caption: "Configured EVM networks, DeFi adapters, and settlement connectors.",
      trend: "infra"
    },
    {
      label: "Value guarded (est)",
      value: formatCompact(valueGuarded),
      caption: "Approximate value routed through Patricon policy-gated actions.",
      trend: sparkline(sixDaySeries)
    }
  ];

  return (
    <>
      <section className="overview-hero panel">
        <div>
          <p className="eyebrow">Machine-Native DeFi Operations Console</p>
          <h1 className="hero-title">Agents never sleep. Your controls should not either.</h1>
          <p className="hero-subtext">
            Patricon combines identity proofs, policy proofs, and settlement enforcement to give operators
            infrastructure-grade visibility across autonomous strategy execution.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/activity">Open machine audit trail</Link>
            <Link className="btn btn-secondary" to="/agents">Review agent fleet</Link>
            <a className="btn btn-secondary" href="https://github.com/SuryaSundarVadali/Patricon/tree/main/dashboard" target="_blank" rel="noreferrer">
              View docs
            </a>
          </div>
        </div>
        <aside className="network-status-panel">
          <h3>Protocol Footprint</h3>
          <div className="status-metric-grid">
            <article className="status-metric">
              <p className="stat-label">Network</p>
              <p className="stat-value">{data.deployment.network}</p>
            </article>
            <article className="status-metric">
              <p className="stat-label">Chain ID</p>
              <p className="stat-value">{data.network.chainId}</p>
            </article>
            <article className="status-metric">
              <p className="stat-label">Policy registry</p>
              <p className="stat-value">{shortenHash(data.deployment.policyRegistry)}</p>
            </article>
            <article className="status-metric">
              <p className="stat-label">Settlement connector</p>
              <p className="stat-value">{shortenHash(data.deployment.settlementConnector)}</p>
            </article>
          </div>
        </aside>
      </section>

      <section className="hero-metric-grid">
        {metricCards.map((metric) => (
          <article className="panel hero-metric-card" key={metric.label}>
            <p className="stat-label">{metric.label}</p>
            <p className="stat-value">{metric.value}</p>
            <p className="sparkline">{metric.trend}</p>
            <p className="muted metric-caption">{metric.caption}</p>
          </article>
        ))}
      </section>

      <section className="panel two-col">
        <div>
          <h3>Infrastructure Coordinates</h3>
          <p>Agent Registry: {shortenHash(data.deployment.agentRegistry)}</p>
          <p>Policy Registry: {shortenHash(data.deployment.policyRegistry)}</p>
          <p>Identity Verifier: {shortenHash(data.deployment.identityVerifier)}</p>
          <p>Policy Verifier: {shortenHash(data.deployment.policyVerifier)}</p>
        </div>
        <div>
          <h3>Execution Surface</h3>
          <p>DeFi Adapter: {shortenHash(data.deployment.policyEnforcedDeFiAdapter)}</p>
          <p>Settlement Connector: {shortenHash(data.deployment.settlementConnector)}</p>
          <p>Target Pool: {shortenHash(data.deployment.targetPool)}</p>
          <p>Explorer: {data.network.explorer || "Not configured"}</p>
        </div>
      </section>
    </>
  );
}