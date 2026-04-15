"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { PageShell } from "../components/PageShell";
import { TxToast } from "../components/TxToast";
import { useAgentActions } from "../../hooks/agent/useAgentActions";
import { useAgentState } from "../../hooks/agent/useAgentState";
import { usePolicyProofWorker } from "../../hooks/usePolicyProofWorker";
import { useErc8004Identity } from "../../hooks/contracts/useErc8004Identity";
import { useZKPolicyRegistry } from "../../hooks/contracts/useZKPolicyRegistry";
import { sanitizeExternalUrl, sanitizeText } from "../../lib/security";

function nowUnix(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

export default function AgentPage() {
  const { address } = useAccount();
  const agentAddress = address as `0x${string}` | undefined;

  const state = useAgentState(agentAddress);
  const actions = useAgentActions(agentAddress);
  const policyWorker = usePolicyProofWorker();
  const policyRegistry = useZKPolicyRegistry(agentAddress);
  const identity = useErc8004Identity(undefined, { owner: agentAddress, pageSize: 100 });

  const [status, setStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [statusMessage, setStatusMessage] = useState<string>();
  const [rejectReason, setRejectReason] = useState("");

  const overview = state.data?.overview;
  const pending = state.data?.pendingActions ?? [];
  const history = state.data?.history ?? [];
  const safeRegistrationUri = overview?.registrationUri ? sanitizeExternalUrl(overview.registrationUri) : undefined;

  const [page, setPage] = useState(0);
  const pageSize = 8;

  const paginatedHistory = useMemo(() => {
    const start = page * pageSize;
    return history.slice(start, start + pageSize);
  }, [history, page]);

  async function handleApprove(actionId: string, proofRequired: boolean) {
    try {
      setStatus("pending");
      setStatusMessage("Approving action...");

      if (proofRequired) {
        const policyState = policyRegistry.getPolicy.data as readonly [`0x${string}`, bigint, bigint, boolean] | undefined;
        if (!policyState || !policyState[3]) {
          throw new Error("Policy is not active on-chain. Cannot approve proof-required action.");
        }

        const proofResult = await policyWorker.generate({
          policyWitness: {
            maxTrade: 1_000n,
            dailyVolumeLimit: 5_000n,
            minDelay: 60n,
            allowedTokenIdA: 11n,
            allowedTokenIdB: 42n,
            previousCumulativeVolume: 0n,
            previousTradeTimestamp: 0n,
            previousNonce: 0n,
            tokenId: 11n,
            newTradeTimestamp: nowUnix(),
            tradeNonce: 1n,
            tradeAmount: 100n
          }
        });

        await actions.approveAction({
          actionId,
          proof: {
            pA: [proofResult.proof.proof.pA[0].toString(), proofResult.proof.proof.pA[1].toString()],
            pB: [
              [proofResult.proof.proof.pB[0][0].toString(), proofResult.proof.proof.pB[0][1].toString()],
              [proofResult.proof.proof.pB[1][0].toString(), proofResult.proof.proof.pB[1][1].toString()]
            ],
            pC: [proofResult.proof.proof.pC[0].toString(), proofResult.proof.proof.pC[1].toString()],
            publicSignals: proofResult.proof.publicSignals.map((signal) => signal.toString())
          }
        });

        setStatusMessage(`Approved with ZK proof in ${Math.round(proofResult.elapsedMs)}ms.`);
      } else {
        await actions.approveAction({ actionId });
        setStatusMessage("Approved action without proof requirement.");
      }

      setStatus("confirmed");
    } catch (error) {
      setStatus("failed");
      setStatusMessage(error instanceof Error ? error.message : "Failed to approve action.");
    }
  }

  async function handleReject(actionId: string) {
    try {
      setStatus("pending");
      setStatusMessage("Rejecting action...");
      await actions.rejectAction({
        actionId,
        reason: rejectReason || "Rejected by operator"
      });
      setStatus("confirmed");
      setStatusMessage("Action rejected.");
    } catch (error) {
      setStatus("failed");
      setStatusMessage(error instanceof Error ? error.message : "Failed to reject action.");
    }
  }

  return (
    <PageShell title="Agent Control Panel" subtitle="Approve or reject autonomous actions with policy-aware proof routing.">
      <section className="app-grid app-grid-2">
        <article className="app-card">
          <h2 style={{ marginTop: 0 }}>Agent Overview</h2>
          <p className="app-hint">Agent: {overview?.agentAddress ?? "-"}</p>
          <p className="app-hint">ERC-8004 Agent ID: {identity.getAgentByOwner?.toString() ?? "Not linked"}</p>
          <p className="app-hint">Passport status: {overview?.passportStatus ?? "NONE"}</p>
          {safeRegistrationUri ? (
            <details>
              <summary>View registration URI</summary>
              <a href={safeRegistrationUri} target="_blank" rel="noreferrer">
                {sanitizeText(safeRegistrationUri, 120)}
              </a>
            </details>
          ) : null}
        </article>

        <article className="app-card">
          <h2 style={{ marginTop: 0 }}>Pending Actions</h2>
          <div className="app-form">
            <label>
              Reject reason
              <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={2} />
            </label>
          </div>
        </article>
      </section>

      <section className="app-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Pending Actions</h2>
        <p className="app-hint">Critical approvals are gated by on-chain policy state; backend responses are advisory only.</p>
        {pending.length === 0 ? <p className="app-hint">No pending actions.</p> : null}
        <div className="app-grid" style={{ gap: "0.75rem" }}>
          {pending.map((item) => (
            <article key={item.id} className="app-card" style={{ background: "#f9fcff" }}>
              <div className="app-inline" style={{ justifyContent: "space-between" }}>
                <strong>{item.type}</strong>
                <span className="app-hint">{sanitizeText(item.protocol, 64)}</span>
              </div>
              <p className="app-hint">Asset: {sanitizeText(item.asset, 64)}</p>
              <p className="app-hint">Amount: {item.amount}</p>
              <p className="app-hint">Estimated gas: {item.estimatedGas}</p>
              <p className="app-hint">
                Policy usage: {item.policyCurrent} / {item.policyLimit}
              </p>
              <div className="app-inline">
                <button className="app-btn app-btn-primary" type="button" onClick={() => void handleApprove(item.id, item.proofRequired)}>
                  {item.proofRequired ? "Generate proof + Approve" : "Approve"}
                </button>
                <button className="app-btn" type="button" onClick={() => void handleReject(item.id)}>
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="app-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Action History</h2>
        <table className="app-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Type</th>
              <th>Status</th>
              <th>Transaction</th>
              <th>Validation</th>
            </tr>
          </thead>
          <tbody>
            {paginatedHistory.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.timestamp).toLocaleString()}</td>
                <td>{row.type}</td>
                <td>{row.status}</td>
                <td>{row.txHash ? <a href={`https://hashkey.blockscout.com/tx/${row.txHash}`} target="_blank" rel="noreferrer">View</a> : "-"}</td>
                <td>{row.validationRef ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="app-inline" style={{ marginTop: "0.7rem" }}>
          <button className="app-btn" type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Prev</button>
          <button className="app-btn" type="button" disabled={(page + 1) * pageSize >= history.length} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </section>

      <div style={{ marginTop: "1rem" }}>
        <TxToast status={status} message={statusMessage} />
      </div>
    </PageShell>
  );
}
