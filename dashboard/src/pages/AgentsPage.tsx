import { DataTable } from "../components/DataTable";
import type { DashboardData } from "../lib/dashboard-data";

type Props = {
  data: DashboardData;
};

export function AgentsPage({ data }: Props) {
  const rows = data.agents.map((agent) => [
    agent.agent,
    agent.agentTypeHash,
    agent.policyHash,
    agent.lastAction
  ]);

  return (
    <DataTable
      title="Registered Agents"
      columns={["Agent", "Type Hash", "Policy Hash", "Last Action"]}
      rows={rows}
      emptyText="No AgentRegistered events found for the selected network range."
    />
  );
}
