import { useState } from "react";
import { id } from "ethers";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { Icon } from "../icons/Icon";
import type { DashboardData } from "../lib/dashboard-data";

const policyRegistryAbi = [
  {
    type: "function",
    name: "registerOrUpdatePolicy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "policyHash", type: "bytes32" },
      { name: "policyVersion", type: "uint64" },
      { name: "circuitVersion", type: "uint64" },
      { name: "active", type: "bool" }
    ],
    outputs: []
  }
] as const;

const agentRegistryAbi = [
  {
    type: "function",
    name: "registerOrUpdateAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "agentType", type: "bytes32" },
      { name: "didHash", type: "bytes32" },
      { name: "publicKeyHash", type: "bytes32" },
      { name: "identityCommitment", type: "bytes32" },
      { name: "identityVersion", type: "uint64" },
      { name: "active", type: "bool" }
    ],
    outputs: []
  }
] as const;

const settlementAbi = [
  {
    type: "function",
    name: "executeSettlementWithProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentRef", type: "bytes32" },
      { name: "agent", type: "address" },
      { name: "payer", type: "address" },
      { name: "payee", type: "address" },
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "tokenId", type: "uint256" },
      { name: "executionTimestamp", type: "uint256" },
      { name: "tradeNonce", type: "uint256" },
      {
        name: "policyProof",
        type: "tuple",
        components: [
          { name: "pA", type: "uint256[2]" },
          { name: "pB", type: "uint256[2][2]" },
          { name: "pC", type: "uint256[2]" }
        ]
      },
      { name: "policySignals", type: "uint256[14]" }
    ],
    outputs: []
  }
] as const;

type Props = {
  data: DashboardData;
};

type PendingAction = "register-agent" | "update-policy" | "execute-settlement" | null;

type ToastType = "success" | "error";

type ToastState = {
  type: ToastType;
  message: string;
  txHash?: string;
} | null;

const zeroAddress = "0x0000000000000000000000000000000000000000";

function toBytes32(value: string): `0x${string}` {
  return id(value) as `0x${string}`;
}

export function WalletActionsPanel({ data }: Props) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [status, setStatus] = useState("No action submitted yet.");
  const [confirmAction, setConfirmAction] = useState<PendingAction>(null);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(type: ToastType, message: string, txHash?: string) {
    setToast({ type, message, txHash });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function waitAndReport(hash: `0x${string}`) {
    if (!publicClient) {
      return;
    }
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    setStatus(`Confirmed tx ${hash} with status ${receipt.status}`);
    if (receipt.status === "success") {
      showToast("success", `Transaction confirmed: ${hash.slice(0, 10)}...`, hash);
    } else {
      showToast("error", `Transaction reverted: ${hash.slice(0, 10)}...`, hash);
    }
  }

  async function handleRegisterAgent() {
    if (!address || !isConnected) {
      setStatus("Connect a wallet first.");
      showToast("error", "Connect a wallet before submitting actions.");
      return;
    }
    if (data.deployment.agentRegistry === zeroAddress) {
      setStatus("AgentRegistry not configured in deployment JSON.");
      showToast("error", "Agent registry is not configured for this network.");
      return;
    }

    setStatus("Submitting registerOrUpdateAgent...");
    const txHash = await writeContractAsync({
      abi: agentRegistryAbi,
      address: data.deployment.agentRegistry as `0x${string}`,
      functionName: "registerOrUpdateAgent",
      args: [
        address,
        toBytes32("yield-farming-agent"),
        toBytes32("did:patricon:demo"),
        toBytes32("pubkey-demo"),
        toBytes32("identity-demo"),
        1n,
        true
      ]
    });
    await waitAndReport(txHash);
  }

  async function handleUpdatePolicy() {
    if (!address || !isConnected) {
      setStatus("Connect a wallet first.");
      showToast("error", "Connect a wallet before submitting actions.");
      return;
    }
    if (data.deployment.policyRegistry === zeroAddress) {
      setStatus("PolicyRegistry not configured in deployment JSON.");
      showToast("error", "Policy registry is not configured for this network.");
      return;
    }

    setStatus("Submitting registerOrUpdatePolicy...");
    const txHash = await writeContractAsync({
      abi: policyRegistryAbi,
      address: data.deployment.policyRegistry as `0x${string}`,
      functionName: "registerOrUpdatePolicy",
      args: [address, toBytes32("policy-demo"), 1n, 1n, true]
    });
    await waitAndReport(txHash);
  }

  async function handleSettlementDemo() {
    if (!address || !isConnected) {
      setStatus("Connect a wallet first.");
      showToast("error", "Connect a wallet before submitting actions.");
      return;
    }
    if (data.deployment.settlementConnector === zeroAddress) {
      setStatus("SettlementConnector not configured in deployment JSON.");
      showToast("error", "Settlement connector is not configured for this network.");
      return;
    }

    setStatus("Submitting executeSettlementWithProof demo call...");
    const now = BigInt(Math.floor(Date.now() / 1000));
    const txHash = await writeContractAsync({
      abi: settlementAbi,
      address: data.deployment.settlementConnector as `0x${string}`,
      functionName: "executeSettlementWithProof",
      args: [
        toBytes32(`dashboard-payment-${Date.now()}`),
        address,
        address,
        address,
        address,
        1n,
        11n,
        now,
        1n,
        {
          pA: [0n, 0n],
          pB: [
            [0n, 0n],
            [0n, 0n]
          ],
          pC: [0n, 0n]
        },
        [
          1n,
          1n,
          BigInt(toBytes32("policy-demo")),
          1n,
          1n,
          1n,
          11n,
          42n,
          0n,
          now - 10n,
          0n,
          11n,
          now,
          1n
        ]
      ]
    });
    await waitAndReport(txHash);
  }

  async function runConfirmedAction() {
    const current = confirmAction;
    if (!current) {
      return;
    }
    setConfirmAction(null);
    try {
      if (current === "register-agent") {
        await handleRegisterAgent();
      }
      if (current === "update-policy") {
        await handleUpdatePolicy();
      }
      if (current === "execute-settlement") {
        await handleSettlementDemo();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`Action failed: ${message}`);
      showToast("error", message);
    }
  }

  const actionLabel =
    confirmAction === "register-agent"
      ? "Register Agent"
      : confirmAction === "update-policy"
        ? "Update Policy"
        : confirmAction === "execute-settlement"
          ? "Execute Settlement"
          : "";

  return (
    <>
      {toast && (
        <aside className={`toast ${toast.type}`} role="status" aria-live="polite">
          <span className="toast-strip" aria-hidden="true" />
          <div className="toast-content">
            <p>
              <Icon name={toast.type === "success" ? "success" : "error"} size={18} aria-hidden="true" /> {toast.message}
            </p>
            {toast.txHash && data.network.explorer && (
              <a
                className="table-link"
                href={`${data.network.explorer}/tx/${toast.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="external" size={16} aria-hidden="true" /> View tx
              </a>
            )}
          </div>
        </aside>
      )}

      {confirmAction && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal glass-panel" role="dialog" aria-modal="true" aria-label="Confirm action">
            <h3>Confirm {actionLabel}</h3>
            <p>
              This action will open your wallet for signature approval. No private keys are ever
              requested by Patricon.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={runConfirmedAction}>
                Confirm and sign
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="panel" id="actions">
        <h3>Operator Actions</h3>
        <p className="muted">
          Submit signer-approved actions for registration, policy updates, and settlement flows.
        </p>
        <div className="action-grid">
          <article className="action-card">
            <h4>Register Agent</h4>
            <p>Bind your connected account to an identity commitment and policy-aware agent type.</p>
            <button
              className="btn btn-primary"
              disabled={!isConnected || isPending}
              onClick={() => setConfirmAction("register-agent")}
            >
              <Icon name="play" size={18} aria-hidden="true" />
              Register agent
            </button>
          </article>
          <article className="action-card">
            <h4>Update Policy</h4>
            <p>Activate policy versions and keep enforcement aligned with current circuit versions.</p>
            <button
              className="btn btn-secondary"
              disabled={!isConnected || isPending}
              onClick={() => setConfirmAction("update-policy")}
            >
              <Icon name="refresh" size={18} aria-hidden="true" />
              Update policy
            </button>
          </article>
          <article className="action-card">
            <h4>Execute Settlement</h4>
            <p>Trigger a proof-gated settlement transaction through the settlement connector.</p>
            <button
              className="btn btn-secondary"
              disabled={!isConnected || isPending}
              onClick={() => setConfirmAction("execute-settlement")}
            >
              <Icon name="settlement" size={18} aria-hidden="true" />
              Execute settlement
            </button>
          </article>
        </div>
        <div className="action-status">
          <span className={`loading-dot ${isPending ? "active" : ""}`} aria-hidden="true">
            {isPending ? <Icon name="spinner" size={16} className="spin" aria-hidden="true" /> : <Icon name="success" size={16} aria-hidden="true" />}
          </span>
          <p className="muted">{isPending ? "Awaiting wallet confirmation..." : status}</p>
        </div>
      </section>
    </>
  );
}