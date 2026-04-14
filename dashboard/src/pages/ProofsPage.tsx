import { useState } from "react";
import { DataTable } from "../components/DataTable";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

type DetailItem = {
  txHash: string;
  gasUsed: string;
};

export function ProofsPage({ data }: Props) {
  const [selected, setSelected] = useState<DetailItem | null>(null);
  const shorten = (value: string) => `${value.slice(0, 8)}...${value.slice(-6)}`;

  const rows = data.activity.map((item) => [
    item.actionType,
    shorten(item.agent),
    item.poolOrAsset,
    item.amount,
    <span className="proof-pill" key={`${item.txHash}-proof`}>
      {item.proofStatus} (policy v1.2)
    </span>,
    item.txStatus,
    item.timestamp,
    <button
      key={`${item.txHash}-details`}
      className="table-link"
      onClick={() => setSelected({ txHash: item.txHash, gasUsed: item.gasUsed })}
    >
      View details
    </button>
  ]);

  return (
    <>
      {selected && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal glass-panel" role="dialog" aria-modal="true" aria-label="Proof details">
            <h3>Proof Execution Details</h3>
            <p className="muted">Advanced execution metadata for operators.</p>
            <p>Transaction: {selected.txHash}</p>
            <p>Gas used: {selected.gasUsed}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      <DataTable
        title="Activity"
        description="Proof-gated actions submitted through Patricon connectors."
        columns={[
          "Type",
          "Agent",
          "Pool/Asset",
          "Amount",
          "Proof status",
          "Tx status",
          "Time",
          "Details"
        ]}
        rows={rows}
        emptyText="No activity yet. Trigger a settlement to observe proof-gated execution events."
        emptyAction={<a className="btn btn-primary" href="#actions">Execute settlement</a>}
      />
    </>
  );
}
