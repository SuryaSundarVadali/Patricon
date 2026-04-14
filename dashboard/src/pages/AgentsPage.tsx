import { DataTable } from "../components/DataTable";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function AgentsPage({ data }: Props) {
  const shorten = (value: string) => (value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value);

  const rows = data.agents.map((agent) => [
    shorten(agent.agent),
    agent.accountType,
    shorten(agent.policyHash),
    agent.lastAction === "-" ? "No actions yet" : agent.lastAction,
    agent.active ? "Active" : "Inactive"
  ]);

  return (
    <DataTable
      title="Agents"
      description="Track policy bindings and signer profile for each registered operator agent."
      columns={["Agent ID", "Account type", "Policy hash", "Last action", "Status"]}
      rows={rows}
      emptyText="No agents yet. Register your first agent to start enforcing policies."
      emptyAction={<a className="btn btn-primary" href="#actions">Register agent</a>}
    />
  );
}
