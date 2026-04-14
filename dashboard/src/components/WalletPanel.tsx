import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, usePublicClient } from "wagmi";

function shorten(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type WalletPanelProps = {
  variant?: "full" | "compact";
};

function accountLabel(isConnected: boolean, address?: string, accountType?: string) {
  if (!isConnected || !address) {
    return "Not connected";
  }

  const mode = accountType?.includes("Smart") ? "Safe smart account" : "EOA";
  return `Connected: ${shorten(address)} (${mode})`;
}

export function WalletPanel({ variant = "full" }: WalletPanelProps) {
  const { address, connector, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
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
          {accountLabel(isConnected, address, accountType)}
        </span>
      </div>
    );
  }

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
                Connect {c.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="wallet-meta">
          <p>Connector: {connector?.name ?? "Unknown"}</p>
          <p>Account type: {accountType}</p>
          <button className="btn btn-secondary" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      )}
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