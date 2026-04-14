import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, usePublicClient, useSwitchChain } from "wagmi";
import { resolveTargetChainId } from "../web3/config";
import { Icon } from "../icons/Icon";

function shorten(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type WalletPanelProps = {
  variant?: "full" | "compact";
  networkName?: string;
};

function accountLabel(isConnected: boolean, address?: string, accountType?: string) {
  if (!isConnected || !address) {
    return "Not connected";
  }

  const mode = accountType?.includes("Smart") ? "Safe smart account" : "EOA";
  return `Connected: ${shorten(address)} (${mode})`;
}

const connectorLabels: Record<string, string> = {
  metaMask: "MetaMask",
  injected: "Browser Wallet",
  walletConnect: "WalletConnect",
  safe: "Safe"
};

function parseWalletErrorMessage(err: unknown): string | null {
  if (!(err instanceof Error)) {
    return null;
  }
  const msg = err.message;
  if (msg.toLowerCase().includes("user rejected")) {
    return "Wallet request was rejected.";
  }
  if (msg.toLowerCase().includes("unsupported chain")) {
    return "Selected wallet network is unsupported for this dashboard.";
  }
  return msg;
}

export function WalletPanel({ variant = "full", networkName = "sepolia" }: WalletPanelProps) {
  const { address, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const targetChainId = resolveTargetChainId(networkName);
  const wrongNetwork = isConnected && chainId !== targetChainId;
  const {
    connect,
    connectors,
    isPending,
    error: connectError
  } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
  const publicClient = usePublicClient();
  const [accountType, setAccountType] = useState("Disconnected");

  useEffect(() => {
    let stale = false;

    async function detect() {
      if (!address || !publicClient) {
        setAccountType("Disconnected");
        return;
      }

      const bytecode = await publicClient.getBytecode({ address });
      const connectorName = connector?.name?.toLowerCase() ?? "";
      const isSmartByConnector =
        connectorName.includes("safe")
        || connectorName.includes("zerodev")
        || connectorName.includes("biconomy")
        || connectorName.includes("4337");

      if (!stale) {
        setAccountType(bytecode || isSmartByConnector ? "Smart Account (ERC-4337 compatible)" : "EOA");
      }
    }

    detect();

    return () => {
      stale = true;
    };
  }, [address, connector, publicClient]);

  const availableConnectors = useMemo(
    () => connectors.filter((c) => c.id !== "safe" || typeof window !== "undefined"),
    [connectors]
  );

  if (variant === "compact") {
    return (
      <div className="wallet-chip-wrap">
        <span className={`status-chip ${isConnected ? "connected" : "disconnected"}`}>
          {wrongNetwork ? `Wrong network (chain ${chainId})` : accountLabel(isConnected, address, accountType)}
        </span>
      </div>
    );
  }

  const walletError = parseWalletErrorMessage(connectError) ?? parseWalletErrorMessage(switchError);

  return (
    <section className="panel" id="wallet-access">
      <div className="panel-header-row">
        <h3>Wallet Access</h3>
        <span className={`status-chip ${isConnected ? "connected" : "disconnected"}`}>
          {accountLabel(isConnected, address, accountType)}
        </span>
      </div>
      {!isConnected ? (
        <>
          <p className="muted">Choose a signer. All actions are authorized in wallet pop-ups.</p>
          <div className="wallet-buttons">
            {availableConnectors.map((c) => (
              <button key={c.uid} disabled={isPending} onClick={() => connect({ connector: c })}>
                {isPending ? "Connecting..." : `Connect ${connectorLabels[c.id] ?? c.name}`}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="wallet-meta">
          <p>Connector: {connector?.name ?? "Unknown"}</p>
          <p>Chain ID: {chainId}</p>
          <p>Account type: {accountType}</p>
          {wrongNetwork && (
            <div className="error-actions">
              <p className="error-row"><Icon name="warning" aria-hidden="true" /> Wrong network. Switch to chain {targetChainId}.</p>
              <button className="btn btn-primary" disabled={isSwitching} onClick={() => switchChain({ chainId: targetChainId })}>
                {isSwitching ? "Switching..." : "Switch Network"}
              </button>
            </div>
          )}
          <button className="btn btn-secondary" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      )}
      {walletError && <p className="error-row"><Icon name="error" aria-hidden="true" /> {walletError}</p>}
      <p className="muted">
        Supported signers include MetaMask, injected wallets, WalletConnect wallets, and
        ERC-4337 compatible smart accounts such as Safe.
      </p>
      <p className="muted wallet-note">
        Patricon never asks for private keys or .env secrets. Signing happens only through your
        wallet provider.
      </p>
    </section>
  );
}