import { Link, Route, Routes } from "react-router-dom";
import { useDashboardData } from "./hooks/useDashboardData";
import { OverviewPage } from "./pages/OverviewPage";
import { AgentsPage } from "./pages/AgentsPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { ProofsPage } from "./pages/ProofsPage";

export default function App() {
  const networkName = "hashkeyTestnet";
  const { data, loading, error } = useDashboardData(networkName);

  return (
    <div className="app-shell">
      <header>
        <h1>Patricon Dashboard</h1>
        <p>Operational visibility for identity-bound autonomous agents and proof-gated actions.</p>
      </header>
      <nav>
        <Link to="/">Overview</Link>
        <Link to="/agents">Agents</Link>
        <Link to="/policies">Policies</Link>
        <Link to="/activity">Activity / Proofs</Link>
      </nav>
      <main>
        {loading && <section className="panel"><p>Loading dashboard data...</p></section>}
        {error && !loading && (
          <section className="panel error">
            <h2>Data Source Error</h2>
            <p>{error}</p>
          </section>
        )}
        {data && !loading && !error && (
          <Routes>
            <Route path="/" element={<OverviewPage data={data} />} />
            <Route path="/agents" element={<AgentsPage data={data} />} />
            <Route path="/policies" element={<PoliciesPage data={data} />} />
            <Route path="/activity" element={<ProofsPage data={data} />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
