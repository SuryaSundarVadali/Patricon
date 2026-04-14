import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useDashboardData } from "./hooks/useDashboardData";
import { WalletPanel } from "./components/WalletPanel";
import { WalletActionsPanel } from "./components/WalletActionsPanel";
import { OverviewPage } from "./pages/OverviewPage";
import { AgentsPage } from "./pages/AgentsPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { ProofsPage } from "./pages/ProofsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  const location = useLocation();
  const networkName = "hashkeyTestnet";
  const { data, loading, error } = useDashboardData(networkName);
  const isOverviewRoute = location.pathname === "/";
  const routeTitles: Record<string, string> = {
    "/": "Overview",
    "/agents": "Agents",
    "/policies": "Policies",
    "/activity": "Activity",
    "/settings": "Settings"
  };

  return (
    <div className="app-shell">
      <header className="top-nav-wrap">
        <div className="top-nav glass-panel">
          <Link className="brand" to="/">
            <span className="brand-mark" aria-hidden="true" />
            <span>Patricon</span>
          </Link>
          <nav className="top-nav-links" aria-label="Primary">
            <NavLink to="/">Overview</NavLink>
            <NavLink to="/agents">Agents</NavLink>
            <NavLink to="/policies">Policies</NavLink>
            <NavLink to="/activity">Activity</NavLink>
            <a href="https://github.com/SuryaSundarVadali/Patricon/tree/main/dashboard" target="_blank" rel="noreferrer">
              Docs
            </a>
          </nav>
          <div className="nav-actions">
            <a className="btn btn-secondary" href="#wallet-access">Connect wallet</a>
            <WalletPanel variant="compact" />
            <a className="btn btn-primary" href="#console">Launch app</a>
          </div>
        </div>
      </header>

      {isOverviewRoute && (
        <section className="hero glass-panel">
          <div className="hero-copy">
            <p className="eyebrow">HashKey Chain Security Console</p>
            <h1>Enforce safe autonomy with every agent.</h1>
            <p className="hero-subtext">
              Patricon combines ZK identity verification, policy enforcement, and proof-gated
              settlements so operators can automate execution without giving up control.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#console">Get started</a>
              <a className="btn btn-secondary" href="https://github.com/SuryaSundarVadali/Patricon" target="_blank" rel="noreferrer">
                View docs
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="metal-block metal-block-lg" />
            <div className="metal-block metal-block-md" />
            <div className="metal-block metal-block-sm" />
            <div className="metal-coin">
              <span />
            </div>
          </div>
        </section>
      )}

      <main id="console">
        <div className="route-header">
          <h2>{routeTitles[location.pathname] ?? "Overview"}</h2>
          <p>Operational visibility for identity-bound autonomous agents and proof-gated actions.</p>
        </div>

        {loading && <section className="panel"><p>Loading dashboard data...</p></section>}
        {error && !loading && (
          <section className="panel error">
            <h2>Data Source Error</h2>
            <p>{error}</p>
          </section>
        )}
        {data && !loading && !error && (
          <>
            <div className="sub-nav">
              <NavLink to="/">Overview</NavLink>
              <NavLink to="/agents">Agents</NavLink>
              <NavLink to="/policies">Policies</NavLink>
              <NavLink to="/activity">Activity</NavLink>
              <NavLink to="/settings">Settings</NavLink>
            </div>
            <WalletPanel />
            <Routes>
              <Route path="/" element={<OverviewPage data={data} />} />
              <Route path="/agents" element={<AgentsPage data={data} />} />
              <Route path="/policies" element={<PoliciesPage data={data} />} />
              <Route path="/activity" element={<ProofsPage data={data} />} />
              <Route path="/settings" element={<SettingsPage data={data} />} />
            </Routes>
            <WalletActionsPanel data={data} />
          </>
        )}
      </main>
    </div>
  );
}
