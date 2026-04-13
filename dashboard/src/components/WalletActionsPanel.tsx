import { useState } from "react";
import { id } from "ethers";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { DashboardData } from "../lib/dashboard-data";

const policyRegistryAbi = [
  {
    type: "function",
    name: "registerOrUpdatePolicy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "policyHash", type: "bytes32" },
      { name: "policyVersion", type: "uint64" },
      { name: "circuitVersion", type: "uint64" },
      { name: "active", type: "bool" }
    ],
    outputs: []
  }
] as const;

const agentRegistryAbi = [
  {
    type: "function",
    name: "registerOrUpdateAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "agentType", type: "bytes32" },
      { name: "didHash", type: "bytes32" },
      { name: "publicKeyHash", type: "bytes32" },
      { name: "identityCommitment", type: "bytes32" },
      { name: "identityVersion", type: "uint64" },
      { name: "active", type: "bool" }
    ],
    outputs: []
  }
] as const;

const settlementAbi = [
  {
    type: "function",
    name: "executeSettlementWithProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentRef", type: "bytes32" },
      { name: "agent", type: "address" },
      { name: "payer", type: "address" },
      { name: "payee", type: "address" },
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "tokenId", type: "uint256" },
      { name: "executionTimestamp", type: "uint256" },
      { name: "tradeNonce", type: "uint256" },
      {
        name: "policyProof",
        type: "tuple",
        components: [
          { name: "pA", type: "uint256[2]" },
          { name: "pB", type: "uint256[2][2]" },
          { name: "pC", type: "uint256[2]" }
        ]
      },
      { name: "policySignals", type: "uint256[14]" }
    ],
    outputs: []
  }
] as const;

type Props = {
  data: DashboardData;
};

const zeroAddress = "0x0000000000000000000000000000000000000000";

function toBytes32(value: string): `0x${string}` {
  return id(value) as `0x${string}`;
}

export function WalletActionsPanel({ data }: Props) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [status, setStatus] = useState("No action submitted yet.");

  async function waitAndReport(hash: `0x${string}`) {
    if (!publicClient) {
      return;
    }
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    setStatus(`Confirmed tx ${hash} with status ${receipt.status}`);
  }

  async function handleRegisterAgent() {
    if (!address || !isConnected) {
      setStatus("Connect a wallet first.");
      return;
    }
    if (data.deployment.agentRegistry === zeroAddress) {
      setStatus("AgentRegistry not configured in deployment JSON.");
      return;
    }

    setStatus("Submitting registerOrUpdateAgent...");
    const txHash = await writeContractAsync({
      abi: agentRegistryAbi,
      address: data.deployment.agentRegistry as `0x${string}`,
      functionName: "registerOrUpdateAgent",
      args: [address, toBytes32("yield-farming-agent"), toBytes32("did:patricon:demo"), toBytes32("pubkey-demo"), toBytes32("identity-demo"), 1n, true]
    });
    await waitAndReport(txHash);
  }

  async function handleUpdatePolicy() {
    if (!address || !isConnected) {
      setStatus("Connect a wallet first.");
      return;
    }
    if (data.deployment.policyRegistry === zeroAddress) {
      setStatus("PolicyRegistry not configured in deployment JSON.");
      return;
    }

    setStatus("Submitting registerOrUpdatePolicy...");
    const txHash = await writeContractAsync({
      abi: policyRegistryAbi,
      address: data.deployment.policyRegistry as `0x${string}`,
      functionName: "registerOrUpdatePolicy",
      args: [address, toBytes32("policy-demo"), 1n, 1n, true]
    });
    await waitAndReport(txHash);
  }

  async function handleSettlementDemo() {
    if (!address || !isConnected) {
      setStatus("Connect a wallet first.");
      return;
    }
    if (data.deployment.settlementConnector === zeroAddress) {
      setStatus("SettlementConnector not configured in deployment JSON.");
      return;
    }

    setStatus("Submitting executeSettlementWithProof demo call...");
    const now = BigInt(Math.floor(Date.now() / 1000));
    const txHash = await writeContractAsync({
      abi: settlementAbi,
      address: data.deployment.settlementConnector as `0x${string}`,
      functionName: "executeSettlementWithProof",
      args: [
        toBytes32(`dashboard-payment-${Date.now()}`),
        address,
        address,
        address,
        address,
        1n,
        11n,
        now,
        1n,
        {
          pA: [0n, 0n],
          pB: [
            [0n, 0n],
            [0n, 0n]
          ],
          pC: [0n, 0n]
        },
        [
          1n,
          1n,
          BigInt(toBytes32("policy-demo")),
          1n,
          1n,
          1n,
          11n,
          42n,
          0n,
          now - 10n,
          0n,
          11n,
          now,
          1n
        ]
      ]
    });
    await waitAndReport(txHash);
  }

  return (
    <section className="panel">
      <h2>Wallet Actions</h2>
      <p className="muted">
        These actions are signed by the connected wallet only. Patricon does not store private
        keys.
      </p>
      <div className="wallet-buttons">
        <button disabled={!isConnected || isPending} onClick={handleRegisterAgent}>
          Register Agent (Demo)
        </button>
        <button disabled={!isConnected || isPending} onClick={handleUpdatePolicy}>
          Update Policy (Demo)
        </button>
        <button disabled={!isConnected || isPending} onClick={handleSettlementDemo}>
          Trigger Settlement (Demo)
        </button>
      </div>
      <p className="muted">{status}</p>
    </section>
  );
}