import { createConfig, http } from "wagmi";
import { injected, metaMask, safe, walletConnect } from "wagmi/connectors";
import { defineChain } from "viem";

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const hashkeyTestnetRpcUrl = getRequiredEnv("VITE_HASHKEY_TESTNET_RPC_URL");
const sepoliaRpcUrl = getRequiredEnv("VITE_SEPOLIA_RPC_URL");

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
      http: [hashkeyTestnetRpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "HashKey Explorer",
      url: "https://hashkey.blockscout.com"
    }
  }
});

const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [sepoliaRpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io"
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
  chains: [sepolia, hashkeyTestnet],
  connectors,
  transports: {
    [sepolia.id]: http(sepolia.rpcUrls.default.http[0]),
    [hashkeyTestnet.id]: http(hashkeyTestnet.rpcUrls.default.http[0])
  }
});

export { hashkeyTestnet, sepolia };