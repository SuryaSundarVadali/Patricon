import { useEffect, useState } from "react";
import { keccak256, stringToHex } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract
} from "wagmi";
import { Icon } from "../icons/Icon";
import type { DashboardData } from "../lib/dashboard-data";
import {
  agentRegistryWriteAbi,
  isConfiguredAddress,
  policyRegistryWriteAbi,
  roleManagedReadAbi,
  settlementWriteAbi
} from "../contracts";

type Props = {
  data: DashboardData;
  onTransactionSettled?: () => void;
};

type PendingAction = "register-agent" | "update-policy" | "execute-settlement";

type ToastType = "success" | "error" | "info";

type ToastState = {
  type: ToastType;
  message: string;
  txHash?: string;
} | null;

function toBytes32(value: string): `0x${string}` {
  return keccak256(stringToHex(value)) as `0x${string}`;
}

const defaultAdminRole = `0x${"00".repeat(32)}` as `0x${string}`;
const agentRegistrarRole = toBytes32("AGENT_REGISTRAR_ROLE");
const policyAdminRole = toBytes32("POLICY_ADMIN_ROLE");

function formatWriteError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Transaction failed.";
  }
  const msg = err.message.toLowerCase();
  if (msg.includes("user rejected")) {
    return "Signature request was rejected in wallet.";
  }
  if (msg.includes("insufficient funds")) {
    return "Insufficient funds for gas.";
  }
  return err.message;
}

export function WalletActionsPanel({ data, onTransactionSettled }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const {
    writeContractAsync,
    isPending: isAwaitingWallet,
    error: writeError
  } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const {
    data: receipt,
    isLoading: isPendingOnChain,
    isSuccess: isConfirmed,
    isError: isConfirmError,
    error: receiptError
  } = useWaitForTransactionReceipt({ hash: txHash });
  const [status, setStatus] = useState("No action submitted yet.");
  const [confirmAction, setConfirmAction] = useState<PendingAction | null>(null);
  const [submittedAction, setSubmittedAction] = useState<PendingAction | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const wrongNetwork = chainId !== data.network.chainId;
  const explorerTxUrl = txHash && data.network.explorer
    ? `${data.network.explorer}/tx/${txHash}`
    : undefined;

  function showToast(type: ToastType, message: string, txHash?: string) {
    setToast({ type, message, txHash });
    window.setTimeout(() => setToast(null), 4000);
  }

  const canCheckAgentRegistry = !!address && isConfiguredAddress(data.deployment.agentRegistry);
  const canCheckPolicyRegistry = !!address && isConfiguredAddress(data.deployment.policyRegistry);

  const { data: agentPausedRaw } = useReadContract({
    abi: roleManagedReadAbi,
    address: canCheckAgentRegistry ? data.deployment.agentRegistry as `0x${string}` : undefined,
    functionName: "paused",
    query: { enabled: canCheckAgentRegistry }
  });

  const { data: agentRegistrarRoleRaw } = useReadContract({
    abi: roleManagedReadAbi,
    address: canCheckAgentRegistry ? data.deployment.agentRegistry as `0x${string}` : undefined,
    functionName: "hasRole",
    args: canCheckAgentRegistry ? [agentRegistrarRole, address as `0x${string}`] : undefined,
    query: { enabled: canCheckAgentRegistry }
  });

  const { data: agentAdminRoleRaw } = useReadContract({
    abi: roleManagedReadAbi,
    address: canCheckAgentRegistry ? data.deployment.agentRegistry as `0x${string}` : undefined,
    functionName: "hasRole",
    args: canCheckAgentRegistry ? [defaultAdminRole, address as `0x${string}`] : undefined,
    query: { enabled: canCheckAgentRegistry }
  });

  const { data: policyPausedRaw } = useReadContract({
    abi: roleManagedReadAbi,
    address: canCheckPolicyRegistry ? data.deployment.policyRegistry as `0x${string}` : undefined,
    functionName: "paused",
    query: { enabled: canCheckPolicyRegistry }
  });

  const { data: policyAdminRoleRaw } = useReadContract({
    abi: roleManagedReadAbi,
    address: canCheckPolicyRegistry ? data.deployment.policyRegistry as `0x${string}` : undefined,
    functionName: "hasRole",
    args: canCheckPolicyRegistry ? [policyAdminRole, address as `0x${string}`] : undefined,
    query: { enabled: canCheckPolicyRegistry }
  });

  const { data: policyDefaultAdminRoleRaw } = useReadContract({
    abi: roleManagedReadAbi,
    address: canCheckPolicyRegistry ? data.deployment.policyRegistry as `0x${string}` : undefined,
    functionName: "hasRole",
    args: canCheckPolicyRegistry ? [defaultAdminRole, address as `0x${string}`] : undefined,
    query: { enabled: canCheckPolicyRegistry }
  });

  const agentPaused = Boolean(agentPausedRaw);
  const policyPaused = Boolean(policyPausedRaw);
  const canRegisterAgent = Boolean(agentRegistrarRoleRaw) || Boolean(agentAdminRoleRaw);
  const canUpdatePolicy = Boolean(policyAdminRoleRaw) || Boolean(policyDefaultAdminRoleRaw);

  useEffect(() => {
    if (!writeError) {
      return;
    }
    setStatus(formatWriteError(writeError));
    showToast("error", formatWriteError(writeError));
  }, [writeError]);

  useEffect(() => {
    if (!isConfirmError || !receiptError) {
      return;
    }
    const message = formatWriteError(receiptError);
    setStatus(message);
    showToast("error", message, txHash);
    setTxHash(undefined);
    setSubmittedAction(null);
  }, [isConfirmError, receiptError, txHash]);

  useEffect(() => {
    if (!isConfirmed || !receipt || !txHash) {
      return;
    }

    const terminalStatus = receipt.status === "success" ? "Confirmed" : "Failed";
    setStatus(`${terminalStatus}: ${submittedAction ?? "transaction"} (${txHash.slice(0, 10)}...)`);
    if (receipt.status === "success") {
      showToast("success", `Transaction confirmed: ${txHash.slice(0, 10)}...`, txHash);
      onTransactionSettled?.();
    } else {
      showToast("error", `Transaction reverted: ${txHash.slice(0, 10)}...`, txHash);
    }
    setTxHash(undefined);
    setSubmittedAction(null);
  }, [isConfirmed, receipt, submittedAction, txHash, onTransactionSettled]);

  async function handleRegisterAgent() {
    if (!address || !isConnected) {
      setStatus("Connect a wallet first.");
      showToast("error", "Connect a wallet before submitting actions.");
      return;
    }
    if (!isConfiguredAddress(data.deployment.agentRegistry)) {
      setStatus("AgentRegistry not configured in deployment JSON.");
      showToast("error", "Agent registry is not configured for this network.");
      return;
    }

    if (wrongNetwork) {
      setStatus(`Wrong network. Switch to chain ${data.network.chainId}.`);
      showToast("error", `Switch wallet network to chain ${data.network.chainId}.`);
      return;
    }

    if (agentPaused) {
      setStatus("Agent registry is paused. Ask an emergency admin to unpause.");
      showToast("error", "Agent registry is paused.");
      return;
    }

    if (!canRegisterAgent) {
      setStatus("Connected wallet lacks AGENT_REGISTRAR_ROLE for AgentRegistry.");
      showToast("error", "Missing AGENT_REGISTRAR_ROLE. Ask owner/admin to grant role.");
      return;
    }

    setStatus("Awaiting wallet signature for registerOrUpdateAgent...");
    const txHash = await writeContractAsync({
      abi: agentRegistryWriteAbi,
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
    setSubmittedAction("register-agent");
    setTxHash(txHash);
    setStatus(`Submitted. Pending confirmation: ${txHash.slice(0, 10)}...`);
    showToast("info", `Submitted tx: ${txHash.slice(0, 10)}...`, txHash);
  }

  async function handleUpdatePolicy() {
    if (!address || !isConnected) {
      setStatus("Connect a wallet first.");
      showToast("error", "Connect a wallet before submitting actions.");
      return;
    }
    if (!isConfiguredAddress(data.deployment.policyRegistry)) {
      setStatus("PolicyRegistry not configured in deployment JSON.");
      showToast("error", "Policy registry is not configured for this network.");
      return;
    }

    if (wrongNetwork) {
      setStatus(`Wrong network. Switch to chain ${data.network.chainId}.`);
      showToast("error", `Switch wallet network to chain ${data.network.chainId}.`);
      return;
    }

    if (policyPaused) {
      setStatus("Policy registry is paused. Ask an emergency admin to unpause.");
      showToast("error", "Policy registry is paused.");
      return;
    }

    if (!canUpdatePolicy) {
      setStatus("Connected wallet lacks POLICY_ADMIN_ROLE for PolicyRegistry.");
      showToast("error", "Missing POLICY_ADMIN_ROLE. Ask owner/admin to grant role.");
      return;
    }

    setStatus("Awaiting wallet signature for registerOrUpdatePolicy...");
    const txHash = await writeContractAsync({
      abi: policyRegistryWriteAbi,
      address: data.deployment.policyRegistry as `0x${string}`,
      functionName: "registerOrUpdatePolicy",
      args: [address, toBytes32("policy-demo"), 1n, 1n, true]
    });
    setSubmittedAction("update-policy");
    setTxHash(txHash);
    setStatus(`Submitted. Pending confirmation: ${txHash.slice(0, 10)}...`);
    showToast("info", `Submitted tx: ${txHash.slice(0, 10)}...`, txHash);
  }

  async function handleSettlementDemo() {
    if (!address || !isConnected) {
      setStatus("Connect a wallet first.");
      showToast("error", "Connect a wallet before submitting actions.");
      return;
    }
    if (!isConfiguredAddress(data.deployment.settlementConnector)) {
      setStatus("SettlementConnector not configured in deployment JSON.");
      showToast("error", "Settlement connector is not configured for this network.");
      return;
    }

    if (wrongNetwork) {
      setStatus(`Wrong network. Switch to chain ${data.network.chainId}.`);
      showToast("error", `Switch wallet network to chain ${data.network.chainId}.`);
      return;
    }

    setStatus("Awaiting wallet signature for executeSettlementWithProof...");
    const now = BigInt(Math.floor(Date.now() / 1000));
    const txHash = await writeContractAsync({
      abi: settlementWriteAbi,
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
    setSubmittedAction("execute-settlement");
    setTxHash(txHash);
    setStatus(`Submitted. Pending confirmation: ${txHash.slice(0, 10)}...`);
    showToast("info", `Submitted tx: ${txHash.slice(0, 10)}...`, txHash);
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
            <div className="detail-grid">
              <p><strong>Network:</strong> {data.deployment.network} (chain {data.network.chainId})</p>
              <p><strong>From:</strong> {address ?? "Not connected"}</p>
              <p><strong>Gas:</strong> Estimated in wallet confirmation modal.</p>
            </div>
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
        {wrongNetwork && (
          <div className="error-actions">
            <p className="error-row"><Icon name="warning" aria-hidden="true" /> Wallet is on chain {chainId}. Required: {data.network.chainId}.</p>
            <button className="btn btn-primary" disabled={isSwitchingChain} onClick={() => switchChain({ chainId: data.network.chainId })}>
              {isSwitchingChain ? "Switching..." : "Switch network"}
            </button>
          </div>
        )}
        {!wrongNetwork && isConnected && !canRegisterAgent && (
          <p className="error-row"><Icon name="warning" aria-hidden="true" /> This wallet cannot register agents on-chain. Missing AGENT_REGISTRAR_ROLE.</p>
        )}
        <div className="action-grid">
          <article className="action-card">
            <h4>Register Agent</h4>
            <p>Bind your connected account to an identity commitment and policy-aware agent type.</p>
            <button
              className="btn btn-primary"
              disabled={!isConnected || isAwaitingWallet || isPendingOnChain || wrongNetwork || !canRegisterAgent || agentPaused}
              onClick={() => setConfirmAction("register-agent")}
              title={!isConnected
                ? "Connect wallet to continue"
                : wrongNetwork
                  ? "Switch to required network"
                  : agentPaused
                    ? "AgentRegistry is paused"
                    : !canRegisterAgent
                      ? "Missing AGENT_REGISTRAR_ROLE"
                      : undefined}
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
              disabled={!isConnected || isAwaitingWallet || isPendingOnChain || wrongNetwork || !canUpdatePolicy || policyPaused}
              onClick={() => setConfirmAction("update-policy")}
              title={!isConnected
                ? "Connect wallet to continue"
                : wrongNetwork
                  ? "Switch to required network"
                  : policyPaused
                    ? "PolicyRegistry is paused"
                    : !canUpdatePolicy
                      ? "Missing POLICY_ADMIN_ROLE"
                      : undefined}
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
              disabled={!isConnected || isAwaitingWallet || isPendingOnChain || wrongNetwork}
              onClick={() => setConfirmAction("execute-settlement")}
              title={!isConnected ? "Connect wallet to continue" : wrongNetwork ? "Switch to required network" : undefined}
            >
              <Icon name="settlement" size={18} aria-hidden="true" />
              Execute settlement
            </button>
          </article>
        </div>
        <div className="action-status">
          <span className={`loading-dot ${isAwaitingWallet || isPendingOnChain ? "active" : ""}`} aria-hidden="true">
            {isAwaitingWallet || isPendingOnChain
              ? <Icon name="spinner" size={16} className="spin" aria-hidden="true" />
              : <Icon name="success" size={16} aria-hidden="true" />}
          </span>
          <p className="muted">
            {isAwaitingWallet
              ? "Awaiting wallet signature..."
              : isPendingOnChain
                ? "Transaction pending on-chain confirmation..."
                : status}
          </p>
          {explorerTxUrl && (
            <a className="table-link" href={explorerTxUrl} target="_blank" rel="noreferrer">
              <Icon name="external" size={16} aria-hidden="true" /> View pending tx
            </a>
          )}
        </div>
      </section>
    </>
  );
}