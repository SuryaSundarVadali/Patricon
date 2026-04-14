import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function SettingsPage({ data }: Props) {
  return (
    <section className="panel two-col">
      <article>
        <h3>Connection Defaults</h3>
        <p className="muted">Current network: {data.deployment.network}</p>
        <p className="muted">Chain ID: {data.network.chainId}</p>
        <p className="muted">
          Wallet signing is delegated to your provider. No private keys are stored or requested.
        </p>
      </article>
      <article>
        <h3>Policy Controls</h3>
        <p className="muted">Use policy updates to maintain limits, pool allowlists, time windows, and version tags.</p>
        <p className="muted">
          Advanced proof internals are hidden from operational tables and available through detail
          modals when needed.
        </p>
      </article>
    </section>
  );
}
