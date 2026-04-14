import { JsonRpcProvider, Contract, type EventLog } from "ethers";

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

function isEventLog(event: unknown): event is EventLog {
  return typeof event === "object" && event !== null && "args" in event;
}

const zeroAddress = "0x0000000000000000000000000000000000000000";

const policyRegistryAbi = [
  "event PolicyConfigured(address indexed agent, bytes32 indexed policyHash, uint64 policyVersion, uint64 circuitVersion, bool active)",
  "function getPolicyForAgent(address agent) view returns (bytes32 policyHash, uint64 policyVersion, uint64 circuitVersion, bool active)"
] as const;

const agentRegistryAbi = [
  "event AgentRegistered(address indexed agent, bytes32 indexed didHash, bytes32 agentType, bytes32 publicKeyHash, bytes32 identityCommitment, uint64 identityVersion, bool active)",
  "function getAgentBinding(address agent) view returns (bytes32 didHash, bytes32 publicKeyHash, bytes32 identityCommitment, bool active)"
] as const;

const defiAdapterAbi = [
  "event DepositExecuted(address indexed agent, uint256 amount, uint256 tokenId, uint256 tradeNonce)",
  "event WithdrawExecuted(address indexed agent, uint256 amount, uint256 tokenId, uint256 tradeNonce)",
  "event RebalanceExecuted(address indexed agent, uint256 amount, uint256 fromTokenId, uint256 toTokenId, uint256 tradeNonce)"
] as const;

declare const __PATRICON_CONFIG_DIR__: string;

function isZeroAddress(address: string): boolean {
  return address.toLowerCase() === zeroAddress;
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

  const provider = new JsonRpcProvider(network.rpcUrl, network.chainId);

  const policyRows: PolicyRow[] = [];
  const agentRows: AgentRow[] = [];
  const activityRows: ActivityRow[] = [];

  if (!isZeroAddress(deployment.policyRegistry)) {
    const policyRegistry = new Contract(deployment.policyRegistry, policyRegistryAbi, provider);
    const policyEvents = await policyRegistry.queryFilter(policyRegistry.filters.PolicyConfigured(), -3_000);

    for (const event of policyEvents) {
      if (!isEventLog(event)) {
        continue;
      }
      const [agent, policyHash, policyVersion, circuitVersion, active] = event.args;
      policyRows.push({
        agent,
        policyHash,
        policyVersion: Number(policyVersion),
        circuitVersion: Number(circuitVersion),
        active
      });
    }
  }

  if (!isZeroAddress(deployment.agentRegistry)) {
    const agentRegistry = new Contract(deployment.agentRegistry, agentRegistryAbi, provider);
    const agentEvents = await agentRegistry.queryFilter(agentRegistry.filters.AgentRegistered(), -3_000);

    for (const event of agentEvents) {
      if (!isEventLog(event)) {
        continue;
      }
      const [agent, didHash, agentTypeHash, _publicKeyHash, _identityCommitment, _identityVersion, active] = event.args;
      const linkedPolicy = policyRows.find((p) => p.agent.toLowerCase() === agent.toLowerCase());

      const bytecode = await provider.getCode(agent);
      agentRows.push({
        agent,
        didHash,
        agentTypeHash,
        accountType: bytecode !== "0x" ? "Safe" : "EOA",
        policyHash: linkedPolicy?.policyHash ?? "-",
        lastAction: "-",
        active
      });
    }
  }

  if (!isZeroAddress(deployment.policyEnforcedDeFiAdapter)) {
    const adapter = new Contract(deployment.policyEnforcedDeFiAdapter, defiAdapterAbi, provider);
    const [depositEvents, withdrawEvents, rebalanceEvents] = await Promise.all([
      adapter.queryFilter(adapter.filters.DepositExecuted(), -3_000),
      adapter.queryFilter(adapter.filters.WithdrawExecuted(), -3_000),
      adapter.queryFilter(adapter.filters.RebalanceExecuted(), -3_000)
    ]);

    const mapEvent = async (event: EventLog, action: string): Promise<ActivityRow> => {
      const receipt = await event.getTransactionReceipt();
      const block = await provider.getBlock(event.blockNumber);
      const [agent, amount, tokenId] = event.args;
      return {
        txHash: event.transactionHash,
        actionType: action,
        agent,
        poolOrAsset: `Token #${Number(tokenId)}`,
        amount: amount.toString(),
        proofStatus: "Proof ✓",
        txStatus: receipt?.status === 1 ? "confirmed" : "reverted",
        gasUsed: receipt?.gasUsed?.toString() ?? "0",
        blockNumber: event.blockNumber,
        timestamp: block ? new Date(block.timestamp * 1000).toISOString() : ""
      };
    };

    const depositLogs = depositEvents.filter(isEventLog);
    const withdrawLogs = withdrawEvents.filter(isEventLog);
    const rebalanceLogs = rebalanceEvents.filter(isEventLog);

    activityRows.push(
      ...(await Promise.all(depositLogs.map((e) => mapEvent(e, "deposit")))),
      ...(await Promise.all(withdrawLogs.map((e) => mapEvent(e, "withdraw")))),
      ...(await Promise.all(rebalanceLogs.map((e) => mapEvent(e, "rebalance"))))
    );

    const lastByAgent = new Map<string, string>();
    for (const event of [...depositLogs, ...withdrawLogs, ...rebalanceLogs]) {
      const agent = event.args[0] as string;
      const action = event.eventName.replace("Executed", "").toLowerCase();
      lastByAgent.set(agent.toLowerCase(), action);
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