import { useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useDashboardData } from "./hooks/useDashboardData";
import { WalletPanel } from "./components/WalletPanel";
import { Icon } from "./icons/Icon";
import { OverviewPage } from "./pages/OverviewPage";
import { AgentsPage } from "./pages/AgentsPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { ProofsPage } from "./pages/ProofsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SettlementPage } from "./pages/SettlementPage";

export default function App() {
  const location = useLocation();
  const networkName = (import.meta.env.VITE_DASHBOARD_NETWORK as string | undefined) ?? "sepolia";
  const { data, loading, error, retry } = useDashboardData(networkName);
  const networkLabel = data?.deployment.network ?? networkName;
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
            <NavLink onClick={() => setMenuOpen(false)} to="/"><Icon name="overview" size={24} aria-hidden="true" />Overview</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/agents"><Icon name="agents" size={24} aria-hidden="true" />Agents</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/policies"><Icon name="policies" size={24} aria-hidden="true" />Policies</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/activity"><Icon name="activity" size={24} aria-hidden="true" />Activity</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/settlement"><Icon name="settlement" size={24} aria-hidden="true" />Settlement</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/settings"><Icon name="settings" size={24} aria-hidden="true" />Settings</NavLink>
          </nav>

          <div className="nav-actions">
            <span className="status-chip">{networkLabel}</span>
            <WalletPanel variant="compact" networkName={networkName} />
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

        {loading && (
          <section className="panel skeleton-panel" aria-label="Loading dashboard">
            <div className="skeleton-title" />
            <div className="skeleton-grid">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </section>
        )}
        {error && !loading && (
          <section className="panel error">
            <h2>Data Source Error</h2>
            <p className="error-row"><Icon name="error" aria-hidden="true" /> {error}</p>
            <div className="error-actions">
              <button className="btn btn-primary" onClick={retry}>
                <Icon name="refresh" aria-hidden="true" /> Retry
              </button>
              <Link className="btn btn-secondary" to="/settings">
                <Icon name="details" aria-hidden="true" /> View logs
              </Link>
            </div>
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
              <WalletPanel networkName={networkName} />
            <Routes>
              <Route path="/" element={<OverviewPage data={data} />} />
              <Route path="/agents" element={<AgentsPage data={data} />} />
              <Route path="/policies" element={<PoliciesPage data={data} />} />
              <Route path="/activity" element={<ProofsPage data={data} />} />
              <Route path="/settlement" element={<SettlementPage data={data} onRefresh={retry} />} />
              <Route path="/settings" element={<SettingsPage data={data} />} />
            </Routes>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
