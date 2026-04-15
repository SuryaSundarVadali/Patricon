"use client";

import { useMemo, useState } from "react";
import { keccak256, stringToHex } from "viem";
import { useAccount, useChainId } from "wagmi";

import { PageShell } from "../components/PageShell";
import { TxToast } from "../components/TxToast";
import { useAgentPassport } from "../../hooks/contracts/useAgentPassport";
import { useZKPolicyRegistry } from "../../hooks/contracts/useZKPolicyRegistry";
import { toBigIntSafe } from "../../lib/security";
import { chains } from "../../web3/config";

function hashAsBytes32(value: string): `0x${string}` {
  return keccak256(stringToHex(value));
}

function txUrl(chainId: number, txHash?: string): string | undefined {
  if (!txHash) {
    return undefined;
  }
  const chain = chains.find((candidate) => candidate.id === chainId);
  if (!chain) {
    return undefined;
  }
  return `${chain.blockExplorers?.default.url}/tx/${txHash}`;
}

export default function PassportPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const passport = useAgentPassport(address);
  const policyRegistry = useZKPolicyRegistry(address);

  const [status, setStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [statusMessage, setStatusMessage] = useState<string>();
  const [lastTx, setLastTx] = useState<`0x${string}` | undefined>();

  const [ageRange, setAgeRange] = useState("18-25");
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [riskTier, setRiskTier] = useState("LOW");
  const [maxPositionSize, setMaxPositionSize] = useState("1000");

  const [policyVersion, setPolicyVersion] = useState("1");
  const [circuitVersion, setCircuitVersion] = useState("1");

  const passportData = passport.getPassport.data as readonly [`0x${string}`, `0x${string}`, `0x${string}`, boolean] | undefined;
  const hasPassport = Boolean(passportData?.[3]);

  const policySummary = useMemo(() => {
    const data = policyRegistry.getPolicy.data as readonly [`0x${string}`, bigint, bigint, boolean] | undefined;
    if (!data) {
      return "No active policy";
    }
    return `Policy v${data[1].toString()}, circuit v${data[2].toString()}, active=${data[3] ? "yes" : "no"}`;
  }, [policyRegistry.getPolicy.data]);

  async function handleRegisterPassport() {
    if (!address) {
      return;
    }

    try {
      setStatus("pending");
      setStatusMessage("Generating ZK-ID proof...");

      const [minAge] = ageRange.split("-").map((v) => Number(v));
      const riskScore = riskTier === "LOW" ? 20 : riskTier === "MEDIUM" ? 50 : 80;
      const maxPosition = toBigIntSafe(maxPositionSize, 1n);

      const result = await passport.verifyZkIdAndRegisterPassport({
        zkInput: {
          credentials: {
            age: minAge + 1,
            minAge,
            jurisdictionCode: jurisdiction === "IN" ? 1 : 2,
            allowedJurisdictions: [1, 2],
            riskScore,
            maxRiskScore: 85
          },
          identityWitness: {
            merkleRoot: 1n,
            agentPublicKeyHash: BigInt(address),
            policyHash: BigInt(hashAsBytes32(`${jurisdiction}:${riskTier}:${maxPosition.toString()}`)),
            identityNonce: BigInt(Date.now()),
            merkleLeaf: 1n,
            merklePathElements: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
            merklePathIndices: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
            agentSecret: 1n
          }
        },
        registration: {
          agentType: hashAsBytes32("patricon-agent"),
          didHash: hashAsBytes32(`did:patricon:${address}`),
          publicKeyHash: hashAsBytes32(address),
          identityVersion: 1n
        }
      });

      setLastTx(result.txHash);
      setStatus("confirmed");
      setStatusMessage(`Proof ${Math.round(result.proofTimeMs)}ms, verifier check ${Math.round(result.verificationTimeMs)}ms`);
    } catch (error) {
      setStatus("failed");
      setStatusMessage(error instanceof Error ? error.message : "Failed to register passport.");
    }
  }

  async function handlePolicyUpdate() {
    if (!address) {
      return;
    }

    try {
      setStatus("pending");
      setStatusMessage("Generating policy proof...");

      const maxTrade = toBigIntSafe(maxPositionSize, 1n);

      const result = await policyRegistry.verifyPolicyProofAndAttach({
        proofInput: {
          policyWitness: {
            maxTrade,
            dailyVolumeLimit: maxTrade * 5n,
            minDelay: 60n,
            allowedTokenIdA: 11n,
            allowedTokenIdB: 42n,
            previousCumulativeVolume: 0n,
            previousTradeTimestamp: 0n,
            previousNonce: 0n,
            tokenId: 11n,
            newTradeTimestamp: BigInt(Math.floor(Date.now() / 1000)),
            tradeNonce: 1n,
            tradeAmount: maxTrade > 50n ? 50n : maxTrade
          }
        },
        policyVersion: toBigIntSafe(policyVersion, 1n),
        circuitVersion: toBigIntSafe(circuitVersion, 1n)
      });

      setLastTx(result.txHash);
      setStatus("confirmed");
      setStatusMessage(`Proof ${Math.round(result.proofTimeMs)}ms, verifier check ${Math.round(result.verificationTimeMs)}ms`);
    } catch (error) {
      setStatus("failed");
      setStatusMessage(error instanceof Error ? error.message : "Failed to update policy.");
    }
  }

  return (
    <PageShell title="Agent Passport" subtitle="ZK-ID backed passport registration and policy controls.">
      <section className="app-grid app-grid-2">
        <article className="app-card">
          <h2 style={{ marginTop: 0 }}>Status</h2>
          {!hasPassport ? (
            <p className="app-hint">No Passport. Complete the registration flow to mint one.</p>
          ) : (
            <div className="app-grid" style={{ gap: "0.4rem" }}>
              <p className="app-hint">KYC Tier: Demonstration Tier</p>
              <p className="app-hint">Jurisdiction: {jurisdiction}</p>
              <p className="app-hint">Risk Tier: {riskTier}</p>
              <p className="app-hint">Policy Hash: {passport.getPolicyHash ?? "-"}</p>
            </div>
          )}
        </article>

        <article className="app-card">
          <h2 style={{ marginTop: 0 }}>ZK-ID Note</h2>
          <p className="app-hint">
            The proof enforces age, jurisdiction, and risk constraints without exposing raw credential values in transaction calldata.
          </p>
        </article>
      </section>

      <section className="app-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Register Passport with ZK-ID</h2>
        <form
          className="app-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRegisterPassport();
          }}
        >
          <label>
            Age range
            <select value={ageRange} onChange={(event) => setAgeRange(event.target.value)}>
              <option value="18-25">18-25</option>
              <option value="26-40">26-40</option>
              <option value="41-60">41-60</option>
            </select>
          </label>
          <label>
            Jurisdiction
            <select value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)}>
              <option value="IN">India</option>
              <option value="SG">Singapore</option>
            </select>
          </label>
          <label>
            Risk appetite
            <select value={riskTier} onChange={(event) => setRiskTier(event.target.value)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label>
            Max position size
            <input value={maxPositionSize} onChange={(event) => setMaxPositionSize(event.target.value)} type="number" min={1} />
          </label>
          <button className="app-btn app-btn-primary" type="submit" disabled={!address || passport.zkIdWorker.status === "running"}>
            {passport.zkIdWorker.status === "running" ? "Generating ZK-ID proof..." : "Generate proof + Register"}
          </button>
        </form>
      </section>

      <section className="app-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Policy Update</h2>
        <p className="app-hint">Current policy: {policySummary}</p>
        <form
          className="app-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handlePolicyUpdate();
          }}
        >
          <label>
            Policy version
            <input value={policyVersion} onChange={(event) => setPolicyVersion(event.target.value)} type="number" min={1} />
          </label>
          <label>
            Circuit version
            <input value={circuitVersion} onChange={(event) => setCircuitVersion(event.target.value)} type="number" min={1} />
          </label>
          <button className="app-btn" type="submit" disabled={policyRegistry.policyWorker.status === "running"}>
            {policyRegistry.policyWorker.status === "running" ? "Generating policy proof..." : "Generate proof + Update policy"}
          </button>
        </form>
      </section>

      <div style={{ marginTop: "1rem" }}>
        <TxToast
          status={status}
          message={statusMessage}
          explorerUrl={txUrl(chainId, lastTx)}
        />
      </div>
    </PageShell>
  );
}
