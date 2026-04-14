import { useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useDashboardData } from "./hooks/useDashboardData";
import { WalletPanel } from "./components/WalletPanel";
import { OverviewPage } from "./pages/OverviewPage";
import { AgentsPage } from "./pages/AgentsPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { ProofsPage } from "./pages/ProofsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SettlementPage } from "./pages/SettlementPage";

export default function App() {
  const location = useLocation();
  const networkName = "hashkeyTestnet";
  const { data, loading, error } = useDashboardData(networkName);
  const [menuOpen, setMenuOpen] = useState(false);
  const isOverviewRoute = location.pathname === "/";
  const routeTitles: Record<string, string> = {
    "/": "Overview",
    "/agents": "Agents",
    "/policies": "Policies",
    "/activity": "Activity",
    "/settlement": "Settlement",
    "/settings": "Settings"
  };

  return (
    <div className="app-shell">
      <header className="top-nav-wrap">
        <div className="top-nav glass-panel">
          <div className="brand-wrap">
            <Link className="brand" to="/">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-word">Patricon</span>
            </Link>
            <span className="brand-badge">ZK Agent Policy Layer</span>
          </div>

          <button className="menu-toggle" onClick={() => setMenuOpen((value) => !value)}>
            Menu
          </button>

          <nav className={`top-nav-links ${menuOpen ? "is-open" : ""}`} aria-label="Primary">
            <NavLink onClick={() => setMenuOpen(false)} to="/">Overview</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/agents">Agents</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/policies">Policies</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/activity">Activity</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/settlement">Settlement</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/settings">Settings</NavLink>
          </nav>

          <div className="nav-actions">
            <span className="status-chip">HashKey Chain Testnet</span>
            <WalletPanel variant="compact" />
          </div>
        </div>
      </header>

      <main id="console">
        {!isOverviewRoute && (
          <div className="route-header">
            <h2>{routeTitles[location.pathname] ?? "Overview"}</h2>
            <p>Operational visibility for identity-bound autonomous agents and proof-gated actions.</p>
          </div>
        )}

        {loading && <section className="panel"><p>Loading dashboard data...</p></section>}
        {error && !loading && (
          <section className="panel error">
            <h2>Data Source Error</h2>
            <p>{error}</p>
          </section>
        )}
        {data && !loading && !error && (
          <div className="content-grid">
            <aside className="quick-rail panel">
              <h3>Quick Access</h3>
              <div className="rail-chip-list">
                <Link className="rail-chip" to="/agents">Agent registry</Link>
                <Link className="rail-chip" to="/policies">Policy controls</Link>
                <Link className="rail-chip" to="/activity">Proof events</Link>
                <Link className="rail-chip" to="/settlement">Settlement ops</Link>
              </div>
            </aside>

            <section>
              <WalletPanel />
            <Routes>
              <Route path="/" element={<OverviewPage data={data} />} />
              <Route path="/agents" element={<AgentsPage data={data} />} />
              <Route path="/policies" element={<PoliciesPage data={data} />} />
              <Route path="/activity" element={<ProofsPage data={data} />} />
              <Route path="/settlement" element={<SettlementPage data={data} />} />
              <Route path="/settings" element={<SettingsPage data={data} />} />
            </Routes>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
