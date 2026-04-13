import { DataTable } from "../components/DataTable";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function PoliciesPage({ data }: Props) {
  const rows = data.policies.map((policy) => [
    policy.agent,
    policy.policyHash,
    policy.policyVersion,
    policy.circuitVersion,
    policy.active ? "active" : "inactive"
  ]);

  return (
    <DataTable
      title="Policy Registry"
      columns={["Agent", "Policy Hash", "Policy Version", "Circuit Version", "Status"]}
      rows={rows}
      emptyText="No PolicyConfigured events found for the selected network range."
    />
  );
}
