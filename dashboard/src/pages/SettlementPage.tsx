import { WalletActionsPanel } from "../components/WalletActionsPanel";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function SettlementPage({ data }: Props) {
  return (
    <>
      <section className="panel">
        <h3>Settlement Console</h3>
        <p className="muted">
          Execute proof-gated settlement operations with wallet-confirmed signatures and on-chain
          policy checks.
        </p>
      </section>
      <WalletActionsPanel data={data} />
    </>
  );
}
