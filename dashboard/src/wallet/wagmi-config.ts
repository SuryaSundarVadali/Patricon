import { createConfig, http } from "wagmi";
import { injected, metaMask, safe, walletConnect } from "wagmi/connectors";
import { defineChain } from "viem";

const hashkeyTestnet = defineChain({
  id: 133,
  name: "HashKey Testnet",
  nativeCurrency: {
    name: "HashKey",
    symbol: "HSK",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.hashkey.cloud"]
    }
  },
  blockExplorers: {
    default: {
      name: "HashKey Explorer",
      url: "https://hashkey.blockscout.com"
    }
  }
});

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

const connectors = [
  metaMask(),
  injected({ shimDisconnect: true }),
  safe(),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          metadata: {
            name: "Patricon Dashboard",
            description: "Patricon non-custodial operations dashboard",
            url: "https://patricon.local",
            icons: []
          }
        })
      ]
    : [])
];

export const wagmiConfig = createConfig({
  chains: [hashkeyTestnet],
  connectors,
  transports: {
    [hashkeyTestnet.id]: http(hashkeyTestnet.rpcUrls.default.http[0])
  }
});

export { hashkeyTestnet };