"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { ConnectWalletButton } from "./components/ConnectWalletButton";
import { PageShell } from "./components/PageShell";
import { StatCard } from "./components/StatCard";
import { usePatriconCore } from "../hooks/contracts/usePatriconCore";
import { useErc8004Identity } from "../hooks/contracts/useErc8004Identity";
import { getGlobalStats } from "../lib/api/agentService";

function formatUsd(value: number | undefined): string {
  if (!value) {
    return "$0";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function LandingPage() {
  const patriconCore = usePatriconCore();
  const identity = useErc8004Identity();

  const globalStats = useQuery({
    queryKey: ["agentService", "globalStats"],
    queryFn: getGlobalStats,
    staleTime: 20_000
  });

  const agentCount = useMemo(() => {
    const value = identity.totalAgents.data;
    if (typeof value === "bigint") {
      return Number(value).toLocaleString();
    }
    return "0";
  }, [identity.totalAgents.data]);

  return (
    <PageShell
      title="Patricon Autonomous Coordination"
      subtitle="ZK-ID secured DeFi operations, agent passports, and ERC-8004 trust intelligence."
    >
      <section className="app-card">
        <div className="app-inline" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Operate secure autonomous capital flows</h2>
            <p className="app-hint">Connect your wallet to access passport, vault, agent control, and trust explorer flows.</p>
          </div>
          <ConnectWalletButton />
        </div>
      </section>

      <section className="app-grid app-grid-3" style={{ marginTop: "1rem" }}>
        <StatCard
          label="Global Protocol TVL"
          value={formatUsd(Number(patriconCore.getGlobalTVL ?? globalStats.data?.tvlUsd ?? 0))}
          hint="Aggregated from core and agent-service metrics"
        />
        <StatCard
          label="Registered Agents"
          value={agentCount}
          hint="ERC-8004 identity registry"
        />
        <StatCard
          label="Average Reputation"
          value={`${Math.round(globalStats.data?.averageReputation ?? 0)}/100`}
          hint="Across feedback and validation outcomes"
        />
      </section>

      <section className="app-grid app-grid-2 app-nav-tiles" style={{ marginTop: "1rem" }}>
        <a href="/passport">
          <strong>My Passport</strong>
          <p className="app-hint">Generate ZK-ID proofs and manage your agent passport.</p>
        </a>
        <a href="/vault">
          <strong>My Positions</strong>
          <p className="app-hint">Track deposits, yield, rewards, and portfolio status.</p>
        </a>
        <a href="/agent">
          <strong>Agent Control</strong>
          <p className="app-hint">Review pending autonomous actions and approve/reject.</p>
        </a>
        <a href="/trust">
          <strong>Agent Trust (ERC-8004)</strong>
          <p className="app-hint">Explore identity, reputation, and validation records.</p>
        </a>
      </section>
    </PageShell>
  );
}
