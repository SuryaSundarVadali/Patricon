import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, usePublicClient } from "wagmi";

function shorten(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletPanel() {
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

  return (
    <section className="panel">
      <h2>Wallet</h2>
      {!isConnected ? (
        <div className="wallet-buttons">
          {availableConnectors.map((c) => (
            <button key={c.uid} disabled={isPending} onClick={() => connect({ connector: c })}>
              Connect {c.name}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <p>Connected: {address ? shorten(address) : "-"}</p>
          <p>Connector: {connector?.name ?? "Unknown"}</p>
          <p>Account type: {accountType}</p>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}
      <p className="muted">
        Supported wallets include MetaMask, Rabby and Phantom EVM via injected providers,
        WalletConnect-compatible wallets, and Safe-based smart accounts where available.
      </p>
    </section>
  );
}