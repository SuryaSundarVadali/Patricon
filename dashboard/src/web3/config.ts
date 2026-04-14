import { createConfig, createStorage, http } from "wagmi";
import { injected, metaMask, safe, walletConnect } from "wagmi/connectors";
import { createPublicClient, defineChain, type PublicClient } from "viem";

function getOptionalEnv(name: string): string | undefined {
  const value = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  return value && value.trim().length > 0 ? value : undefined;
}

const localFallbackRpcUrl = "http://127.0.0.1:8545";

export const hashkeyTestnet = defineChain({
  id: 133,
  name: "HashKey Testnet",
  nativeCurrency: {
    name: "HashKey",
    symbol: "HSK",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [getOptionalEnv("VITE_HASHKEY_TESTNET_RPC_URL") ?? localFallbackRpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "HashKey Explorer",
      url: "https://hashkey.blockscout.com"
    }
  }
});

export const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [getOptionalEnv("VITE_SEPOLIA_RPC_URL") ?? localFallbackRpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io"
    }
  }
});

export const chains = [sepolia, hashkeyTestnet] as const;
export type SupportedChainName = "sepolia" | "hashkeyTestnet";

export function resolveTargetChainId(networkName: string): number {
  if (networkName === "hashkeyTestnet") {
    return hashkeyTestnet.id;
  }
  return sepolia.id;
}

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
  chains,
  connectors,
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined
  }),
  transports: {
    [sepolia.id]: http(getOptionalEnv("VITE_SEPOLIA_RPC_URL") ?? localFallbackRpcUrl),
    [hashkeyTestnet.id]: http(getOptionalEnv("VITE_HASHKEY_TESTNET_RPC_URL") ?? localFallbackRpcUrl)
  }
});

export function createReadonlyPublicClient(chainId: number, rpcUrl: string): PublicClient {
  const chain = chains.find((candidate) => candidate.id === chainId) ?? sepolia;
  return createPublicClient({
    chain,
    transport: http(rpcUrl)
  });
}
