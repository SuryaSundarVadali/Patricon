import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function OverviewPage({ data }: Props) {
  return (
    <>
      <section className="panel">
        <h2>Patricon Overview</h2>
        <p>
          Patricon provides a zero-knowledge identity and policy enforcement layer for autonomous
          agents on HashKey Chain.
        </p>
      </section>

      <section className="panel">
        <h2>System Architecture</h2>
        <pre className="diagram">{`[Circuits: Identity + Policy]\n          |\n          v\n[Groth16 Verifiers on-chain]\n          |\n          v\n[PolicyRegistry + AgentRegistry]\n          |\n   +------+-------+\n   |              |\n   v              v\n[DeFi Adapter] [Settlement Connector]\n   ^              ^\n   |              |\n[Agent Service (proof generation + tx submission)]\n          |\n          v\n[Dashboard (state + event observability)]`}</pre>
      </section>

      <section className="panel two-col">
        <div>
          <h3>Network</h3>
          <p>Network: {data.deployment.network}</p>
          <p>Chain ID: {data.network.chainId}</p>
          <p>RPC: {data.network.rpcUrl}</p>
        </div>
        <div>
          <h3>Deployment</h3>
          <p>Policy Registry: {data.deployment.policyRegistry}</p>
          <p>Agent Registry: {data.deployment.agentRegistry}</p>
          <p>DeFi Adapter: {data.deployment.policyEnforcedDeFiAdapter}</p>
          <p>Settlement Connector: {data.deployment.settlementConnector}</p>
        </div>
      </section>
    </>
  );
}