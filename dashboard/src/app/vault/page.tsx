"use client";

import { useMemo, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageShell } from "../components/PageShell";
import { TxToast } from "../components/TxToast";
import { usePatriconCore } from "../../hooks/contracts/usePatriconCore";
import { useVault } from "../../hooks/contracts/useVault";
import { hashkeyTestnet } from "../../web3/config";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export default function VaultPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const vault = useVault();
  const core = usePatriconCore();

  const [amount, setAmount] = useState("0");
  const [tokenId, setTokenId] = useState("11");
  const [status, setStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [statusMessage, setStatusMessage] = useState<string>();
  const [openModal, setOpenModal] = useState<"deposit" | "withdraw" | null>(null);

  const latest = vault.getVaultState;
  const rewards = Number(core.getPendingRewards ?? 0);

  const chartData = useMemo(() => {
    return (vault.yieldHistory.data ?? []).map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleDateString()
    }));
  }, [vault.yieldHistory.data]);

  async function submitVaultAction(type: "deposit" | "withdraw") {
    if (!address) {
      setStatus("failed");
      setStatusMessage("Connect wallet first.");
      return;
    }

    if (chainId !== hashkeyTestnet.id) {
      setStatus("failed");
      setStatusMessage("Wrong network. Switch to HashKey Testnet.");
      return;
    }

    const parsedAmount = BigInt(Math.floor(Number(amount)));
    if (parsedAmount <= 0n) {
      setStatus("failed");
      setStatusMessage("Amount must be greater than 0.");
      return;
    }

    try {
      setStatus("pending");
      setStatusMessage("Submitting transaction...");

      if (type === "deposit") {
        await vault.deposit({
          beneficiary: address,
          amount: parsedAmount,
          tokenId: BigInt(tokenId)
        });
      } else {
        await vault.withdraw({
          beneficiary: address,
          amount: parsedAmount,
          tokenId: BigInt(tokenId)
        });
      }

      setStatus("confirmed");
      setStatusMessage("Transaction confirmed.");
    } catch (error) {
      setStatus("failed");
      setStatusMessage(error instanceof Error ? error.message : "Vault transaction failed.");
    }
  }

  return (
    <PageShell title="Vault & Positions" subtitle="Monitor portfolio, rewards, and execute vault operations.">
      <section className="app-grid app-grid-3">
        <article className="app-card">
          <p className="app-label">Total Deposited</p>
          <h3 className="app-value">{formatNumber(latest?.deposited ?? 0)}</h3>
        </article>
        <article className="app-card">
          <p className="app-label">Current Value</p>
          <h3 className="app-value">{formatNumber(latest?.currentValue ?? 0)}</h3>
        </article>
        <article className="app-card">
          <p className="app-label">Unclaimed Rewards</p>
          <h3 className="app-value">{formatNumber(rewards)}</h3>
        </article>
      </section>

      <section className="app-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Vaults</h2>
        <table className="app-table">
          <thead>
            <tr>
              <th>Vault</th>
              <th>APY</th>
              <th>TVL</th>
              <th>Risk</th>
              <th>Underlying</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Patricon Yield Vault</td>
              <td>{vault.getVaultState ? `${Math.round(vault.computeEstimatedApy(100n, 105n, 86_400))}%` : "-"}</td>
              <td>{formatNumber(latest?.currentValue ?? 0)}</td>
              <td>Medium</td>
              <td>HSK / Stable LP</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="app-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Deposit / Withdraw</h2>
        <p className="app-hint">Allowance checks and exact gas estimates are delegated to wallet simulation before signature.</p>
        <div className="app-inline">
          <button type="button" className="app-btn app-btn-primary" onClick={() => setOpenModal("deposit")}>Deposit</button>
          <button type="button" className="app-btn" onClick={() => setOpenModal("withdraw")}>Withdraw</button>
          {chainId !== hashkeyTestnet.id ? (
            <button
              type="button"
              className="app-btn"
              onClick={() => {
                void switchChainAsync({ chainId: hashkeyTestnet.id });
              }}
            >
              Switch Network to HashKey Chain
            </button>
          ) : null}
        </div>
      </section>

      {openModal ? (
        <section className="app-card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>{openModal === "deposit" ? "Deposit" : "Withdraw"} modal</h3>
          <form className="app-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              Amount
              <input type="number" min={0} value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <label>
              Token ID
              <input type="number" min={0} value={tokenId} onChange={(event) => setTokenId(event.target.value)} />
            </label>
            <div className="app-inline">
              <button
                type="button"
                className="app-btn app-btn-primary"
                onClick={() => {
                  void submitVaultAction(openModal);
                  setOpenModal(null);
                }}
              >
                Confirm {openModal}
              </button>
              <button type="button" className="app-btn" onClick={() => setOpenModal(null)}>Cancel</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="app-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Yield Trend</h2>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="currentValue" stroke="#0a8b84" fill="#9ce3d6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div style={{ marginTop: "1rem" }}>
        <TxToast status={status} message={statusMessage} />
      </div>
    </PageShell>
  );
}
