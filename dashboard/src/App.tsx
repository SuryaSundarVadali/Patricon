import { Link, Route, Routes } from "react-router-dom";
import { AgentsPage } from "./pages/AgentsPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { ProofsPage } from "./pages/ProofsPage";

export default function App() {
  return (
    <div className="app-shell">
      <header>
        <h1>Patricon Dashboard</h1>
        <p>Observe policy-constrained agent execution and proof submission status.</p>
      </header>
      <nav>
        <Link to="/">Agents</Link>
        <Link to="/policies">Policies</Link>
        <Link to="/proofs">Proofs</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<AgentsPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/proofs" element={<ProofsPage />} />
        </Routes>
      </main>
    </div>
  );
}
