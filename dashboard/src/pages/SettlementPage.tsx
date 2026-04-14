import { DataTable } from "../components/DataTable";
import { WalletActionsPanel } from "../components/WalletActionsPanel";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function SettlementPage({ data }: Props) {
  const shorten = (value: string) => (value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value);
  const policyByAgent = new Map(data.policies.map((policy) => [policy.agent.toLowerCase(), policy]));

  const settlementRows = data.activity.map((item) => {
    const policy = policyByAgent.get(item.agent.toLowerCase());
    const intent = item.actionType === "withdraw" ? "yield payout" : item.actionType === "rebalance" ? "fee payout" : "treasury top-up";
    const amount = Number(item.amount);
    const normalizedAmount = Number.isFinite(amount) ? amount.toLocaleString() : item.amount;

    return [
      intent,
      shorten(item.agent),
      "protocol-treasury",
      "strategy-receiver",
      item.poolOrAsset,
      normalizedAmount,
      <span className="proof-pill" key={`${item.txHash}-proof`}>
        {item.proofStatus} · policy v{policy?.policyVersion ?? "-"}
      </span>,
      item.txStatus,
      item.timestamp ? new Date(item.timestamp).toLocaleString() : "-"
    ];
  });

  return (
    <>
      <section className="panel">
        <h3>Settlement / PayFi Console</h3>
        <p className="muted">
          Every settlement is policy-gated and proof-backed before execution. Use this view to track
          intent-level payment flows for autonomous strategy operations.
        </p>
      </section>

      <DataTable
        title="Settlement Intents"
        description="Grouped by intent to show how autonomous actions map to payout and treasury movement."
        columns={[
          "Intent",
          "Agent",
          "Payer",
          "Payee",
          "Asset",
          "Amount",
          "Proof status",
          "Tx status",
          "Timestamp"
        ]}
        rows={settlementRows}
        emptyText="No settlement intents found yet."
      />

      <WalletActionsPanel data={data} />
    </>
  );
}
