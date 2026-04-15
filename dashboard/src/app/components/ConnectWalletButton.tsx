"use client";

import { useMemo } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const primaryConnector = useMemo(() => connectors[0], [connectors]);

  if (isConnected && address) {
    return (
      <button
        type="button"
        className="app-btn"
        onClick={() => {
          void disconnectAsync();
        }}
      >
        Disconnect {shortAddress(address)}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="app-btn app-btn-primary"
      disabled={!primaryConnector || isPending}
      onClick={() => {
        if (!primaryConnector) {
          return;
        }
        void connectAsync({ connector: primaryConnector });
      }}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
