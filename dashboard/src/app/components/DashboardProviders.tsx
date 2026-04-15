"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { warmZkArtifacts } from "../../lib/zk";
import { wagmiConfig } from "../../web3/config";

export function DashboardProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  void warmZkArtifacts();

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
