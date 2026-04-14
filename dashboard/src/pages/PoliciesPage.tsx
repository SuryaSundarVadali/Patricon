import { DataTable } from "../components/DataTable";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function PoliciesPage({ data }: Props) {
  const shorten = (value: string) => (value.length > 16 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value);

  const rows = data.policies.map((policy) => [
    shorten(policy.agent),
    shorten(policy.policyHash),
    `policy v${policy.policyVersion}`,
    `circuit v${policy.circuitVersion}`,
    policy.active ? "Active" : "Inactive"
  ]);

  return (
    <DataTable
      title="Policies"
      description="Versioned policy configurations currently enforced by the on-chain registry."
      columns={["Agent", "Policy hash", "Version tag", "Circuit", "Status"]}
      rows={rows}
      emptyText="No policy entries found. Add or update a policy to enforce operational limits."
      emptyAction={<a className="btn btn-secondary" href="#actions">Update policy</a>}
    />
  );
}
