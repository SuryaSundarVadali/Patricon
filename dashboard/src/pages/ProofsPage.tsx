import { DataTable } from "../components/DataTable";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function ProofsPage({ data }: Props) {
  const rows = data.activity.map((item) => [
    item.action,
    item.status,
    item.gasUsed,
    item.timestamp,
    item.txHash
  ]);

  return (
    <DataTable
      title="Activity and Proof Submissions"
      columns={["Action", "Status", "Gas Used", "Timestamp", "Transaction"]}
      rows={rows}
      emptyText="No proof-gated adapter events found for the selected network range."
    />
  );
}
