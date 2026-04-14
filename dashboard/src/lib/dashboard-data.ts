import {
  parseAbiItem,
  type Address,
  type PublicClient
} from "viem";
import { createReadonlyPublicClient } from "../web3/config";

export type DeploymentInfo = {
  network: string;
  chainId: number;
  identityVerifier: string;
  policyVerifier: string;
  policyRegistry: string;
  agentRegistry: string;
  targetPool: string;
  policyEnforcedDeFiAdapter: string;
  settlementConnector: string;
};

export type NetworkInfo = {
  chainId: number;
  rpcUrl: string;
  explorer: string;
};

export type AgentRow = {
  agent: string;
  accountType: "EOA" | "Safe";
  agentTypeHash: string;
  didHash: string;
  policyHash: string;
  lastAction: string;
  active: boolean;
};

export type PolicyRow = {
  agent: string;
  policyHash: string;
  policyVersion: number;
  circuitVersion: number;
  active: boolean;
};

export type ActivityRow = {
  txHash: string;
  actionType: string;
  agent: string;
  poolOrAsset: string;
  amount: string;
  proofStatus: string;
  txStatus: string;
  gasUsed: string;
  blockNumber: number;
  timestamp: string;
};

export type DashboardData = {
  deployment: DeploymentInfo;
  network: NetworkInfo;
  agents: AgentRow[];
  policies: PolicyRow[];
  activity: ActivityRow[];
};

const zeroAddress = "0x0000000000000000000000000000000000000000";

const policyConfiguredEvent = parseAbiItem(
  "event PolicyConfigured(address indexed agent, bytes32 indexed policyHash, uint64 policyVersion, uint64 circuitVersion, bool active)"
);
const agentRegisteredEvent = parseAbiItem(
  "event AgentRegistered(address indexed agent, bytes32 indexed didHash, bytes32 agentType, bytes32 publicKeyHash, bytes32 identityCommitment, uint64 identityVersion, bool active)"
);
const depositExecutedEvent = parseAbiItem(
  "event DepositExecuted(address indexed agent, uint256 amount, uint256 tokenId, uint256 tradeNonce)"
);
const withdrawExecutedEvent = parseAbiItem(
  "event WithdrawExecuted(address indexed agent, uint256 amount, uint256 tokenId, uint256 tradeNonce)"
);
const rebalanceExecutedEvent = parseAbiItem(
  "event RebalanceExecuted(address indexed agent, uint256 amount, uint256 fromTokenId, uint256 toTokenId, uint256 tradeNonce)"
);

declare const __PATRICON_CONFIG_DIR__: string;

function isZeroAddress(address: string): boolean {
  return address.toLowerCase() === zeroAddress;
}

const logLookbackBlocks = Number(import.meta.env.VITE_LOG_LOOKBACK_BLOCKS ?? 100);
const logChunkSize = Math.max(1, Number(import.meta.env.VITE_LOG_CHUNK_SIZE ?? 10));
const logMaxRetries = Math.max(0, Number(import.meta.env.VITE_LOG_MAX_RETRIES ?? 3));
const logRetryBaseMs = Math.max(0, Number(import.meta.env.VITE_LOG_RETRY_BASE_MS ?? 250));
const logRequestDelayMs = Math.max(0, Number(import.meta.env.VITE_LOG_REQUEST_DELAY_MS ?? 25));
const logMaxChunks = Math.max(1, Number(import.meta.env.VITE_LOG_MAX_CHUNKS ?? 8));

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitedError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  const msg = err.message.toLowerCase();
  return msg.includes("429")
    || msg.includes("rate")
    || msg.includes("throughput")
    || msg.includes("compute units");
}

async function getLogsWithRetry(
  client: PublicClient,
  address: Address,
  event: any,
  fromBlock: bigint,
  toBlock: bigint
) {
  let attempt = 0;
  for (;;) {
    try {
      return await client.getLogs({ address, event, fromBlock, toBlock });
    } catch (err) {
      if (!isRateLimitedError(err) || attempt >= logMaxRetries) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * logRetryBaseMs);
      const delayMs = logRetryBaseMs * (2 ** attempt) + jitter;
      await sleep(delayMs);
      attempt += 1;
    }
  }
}

async function getLogsChunked(client: PublicClient, address: Address, event: any) {
  const latest = Number(await client.getBlockNumber());
  const requestedFromBlock = Math.max(0, latest - logLookbackBlocks);
  const boundedFromBlock = Math.max(requestedFromBlock, latest - logMaxChunks * logChunkSize + 1);

  const logs: any[] = [];
  for (let start = boundedFromBlock; start <= latest; start += logChunkSize) {
    const end = Math.min(start + logChunkSize - 1, latest);
    const chunk = await getLogsWithRetry(client, address, event, BigInt(start), BigInt(end));
    logs.push(...chunk);
    if (logRequestDelayMs > 0) {
      await sleep(logRequestDelayMs);
    }
  }

  return logs;
}

async function getLogsChunkedSafe(client: PublicClient, address: string, event: any) {
  try {
    return await getLogsChunked(client, address as Address, event);
  } catch (err) {
    console.warn("Dashboard log query failed; continuing with partial data", err);
    return [];
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load JSON from ${url} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function loadDeployment(networkName: string): Promise<DeploymentInfo> {
  const relativeUrl = `/config/deployments/${networkName}.json`;
  const fsUrl = `/@fs/${__PATRICON_CONFIG_DIR__}/deployments/${networkName}.json`;

  try {
    return await fetchJson<DeploymentInfo>(relativeUrl);
  } catch {
    return fetchJson<DeploymentInfo>(fsUrl);
  }
}

async function loadNetwork(networkName: string): Promise<NetworkInfo> {
  const relativeUrl = "/config/networks.json";
  const fsUrl = `/@fs/${__PATRICON_CONFIG_DIR__}/networks.json`;

  const envRpcUrlByNetwork: Record<string, string | undefined> = {
    sepolia: import.meta.env.VITE_SEPOLIA_RPC_URL as string | undefined,
    hashkeyTestnet: import.meta.env.VITE_HASHKEY_TESTNET_RPC_URL as string | undefined
  };

  const withRpcUrl = (network: NetworkInfo): NetworkInfo => {
    if (network.rpcUrl && network.rpcUrl.trim().length > 0) {
      return network;
    }

    const envRpc = envRpcUrlByNetwork[networkName];
    if (!envRpc || envRpc.trim().length === 0) {
      throw new Error(`Missing RPC URL for ${networkName}. Set VITE_${networkName === "sepolia" ? "SEPOLIA" : "HASHKEY_TESTNET"}_RPC_URL.`);
    }

    return { ...network, rpcUrl: envRpc };
  };

  const fallback = async (): Promise<NetworkInfo> => {
    const all = await fetchJson<Record<string, NetworkInfo>>(fsUrl);
    const network = all[networkName];
    if (!network) {
      throw new Error(`Unknown network ${networkName} in config/networks.json`);
    }
    return withRpcUrl(network);
  };

  try {
    const all = await fetchJson<Record<string, NetworkInfo>>(relativeUrl);
    const network = all[networkName];
    return network ? withRpcUrl(network) : await fallback();
  } catch {
    return fallback();
  }
}

export async function loadDashboardData(networkName: string): Promise<DashboardData> {
  const deployment = await loadDeployment(networkName);
  const network = await loadNetwork(networkName);

  const publicClient = createReadonlyPublicClient(network.chainId, network.rpcUrl);

  const policyRows: PolicyRow[] = [];
  const agentRows: AgentRow[] = [];
  const activityRows: ActivityRow[] = [];

  if (!isZeroAddress(deployment.policyRegistry)) {
    const policyEvents = await getLogsChunkedSafe(publicClient, deployment.policyRegistry, policyConfiguredEvent);

    for (const event of policyEvents) {
      const args = event.args as {
        agent: Address;
        policyHash: `0x${string}`;
        policyVersion: bigint;
        circuitVersion: bigint;
        active: boolean;
      };
      policyRows.push({
        agent: args.agent,
        policyHash: args.policyHash,
        policyVersion: Number(args.policyVersion),
        circuitVersion: Number(args.circuitVersion),
        active: args.active
      });
    }
  }

  if (!isZeroAddress(deployment.agentRegistry)) {
    const agentEvents = await getLogsChunkedSafe(publicClient, deployment.agentRegistry, agentRegisteredEvent);

    for (const event of agentEvents) {
      const args = event.args as {
        agent: Address;
        didHash: `0x${string}`;
        agentType: `0x${string}`;
        active: boolean;
      };
      const linkedPolicy = policyRows.find((policy) => policy.agent.toLowerCase() === args.agent.toLowerCase());
      const bytecode = await publicClient.getBytecode({ address: args.agent });

      agentRows.push({
        agent: args.agent,
        didHash: args.didHash,
        agentTypeHash: args.agentType,
        accountType: bytecode ? "Safe" : "EOA",
        policyHash: linkedPolicy?.policyHash ?? "-",
        lastAction: "-",
        active: args.active
      });
    }
  }

  if (!isZeroAddress(deployment.policyEnforcedDeFiAdapter)) {
    const receiptCache = new Map<string, Awaited<ReturnType<PublicClient["getTransactionReceipt"]>>>();
    const blockCache = new Map<string, Awaited<ReturnType<PublicClient["getBlock"]>>>();

    const depositEvents = await getLogsChunkedSafe(publicClient, deployment.policyEnforcedDeFiAdapter, depositExecutedEvent);
    const withdrawEvents = await getLogsChunkedSafe(publicClient, deployment.policyEnforcedDeFiAdapter, withdrawExecutedEvent);
    const rebalanceEvents = await getLogsChunkedSafe(publicClient, deployment.policyEnforcedDeFiAdapter, rebalanceExecutedEvent);

    const mapEvent = async (event: any, action: string): Promise<ActivityRow> => {
      const args = event.args as { agent: Address; amount: bigint; tokenId: bigint };
      const txHash = event.transactionHash as `0x${string}`;
      const blockNumber = event.blockNumber as bigint;

      if (!receiptCache.has(txHash)) {
        receiptCache.set(txHash, await publicClient.getTransactionReceipt({ hash: txHash }));
      }
      if (!blockCache.has(blockNumber.toString())) {
        blockCache.set(blockNumber.toString(), await publicClient.getBlock({ blockNumber }));
      }

      const receipt = receiptCache.get(txHash);
      const block = blockCache.get(blockNumber.toString());

      return {
        txHash,
        actionType: action,
        agent: args.agent,
        poolOrAsset: `Token #${Number(args.tokenId)}`,
        amount: args.amount.toString(),
        proofStatus: "Proof ✓",
        txStatus: receipt?.status === "success" ? "confirmed" : "reverted",
        gasUsed: receipt?.gasUsed?.toString() ?? "0",
        blockNumber: Number(blockNumber),
        timestamp: block ? new Date(Number(block.timestamp) * 1000).toISOString() : ""
      };
    };

    activityRows.push(
      ...(await Promise.all(depositEvents.map((event) => mapEvent(event, "deposit")))),
      ...(await Promise.all(withdrawEvents.map((event) => mapEvent(event, "withdraw")))),
      ...(await Promise.all(rebalanceEvents.map((event) => mapEvent(event, "rebalance"))))
    );

    const lastByAgent = new Map<string, string>();
    for (const event of [...depositEvents, ...withdrawEvents, ...rebalanceEvents]) {
      const args = event.args as { agent: Address };
      const eventName = event.eventName as string;
      lastByAgent.set(args.agent.toLowerCase(), eventName.replace("Executed", "").toLowerCase());
    }

    for (const row of agentRows) {
      row.lastAction = lastByAgent.get(row.agent.toLowerCase()) ?? "-";
    }
  }

  activityRows.sort((a, b) => b.blockNumber - a.blockNumber);

  return {
    deployment,
    network,
    agents: agentRows,
    policies: policyRows,
    activity: activityRows.slice(0, 50)
  };
}
