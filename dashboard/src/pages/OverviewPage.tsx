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
  return (
    <>
      <section className="stat-grid">
        <article className="panel stat-card">
          <p className="stat-label">Registered Agents</p>
          <p className="stat-value">{data.agents.length}</p>
        </article>
        <article className="panel stat-card">
          <p className="stat-label">Active Policies</p>
          <p className="stat-value">{data.policies.filter((policy) => policy.active).length}</p>
        </article>
        <article className="panel stat-card">
          <p className="stat-label">Recent Activity</p>
          <p className="stat-value">{data.activity.length}</p>
        </article>
      </section>

      <section className="panel">
        <h3>Patricon Overview</h3>
        <p>
          Patricon provides a zero-knowledge identity and policy enforcement layer for autonomous
          agents on HashKey Chain.
        </p>
      </section>

      <section className="panel two-col">
        <div>
          <h3>Network</h3>
          <p>Network: {data.deployment.network}</p>
          <p>Chain ID: {data.network.chainId}</p>
          <p>RPC Endpoint: {data.network.rpcUrl}</p>
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