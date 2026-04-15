"use client";

import { useMemo, useState } from "react";
import { useReadContracts, useEstimateFeesPerGas } from "wagmi";

import { PageShell } from "../components/PageShell";
import { TxToast } from "../components/TxToast";
import {
  ERC8004IdentityRegistryAbi,
  ERC8004ValidationRegistryAbi,
  getContractAddress,
  isTrustedValidator
} from "../../lib/contracts";
import { useErc8004Identity } from "../../hooks/contracts/useErc8004Identity";
import { useErc8004Reputation } from "../../hooks/contracts/useErc8004Reputation";
import { useErc8004Validation } from "../../hooks/contracts/useErc8004Validation";
import { sanitizeExternalUrl, sanitizeText, toBigIntSafe } from "../../lib/security";
import { useChainId } from "wagmi";

export default function TrustPage() {
  const chainId = useChainId();
  const identity = useErc8004Identity();

  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [selectedAgentId, setSelectedAgentId] = useState<bigint | undefined>();

  const [feedbackScore, setFeedbackScore] = useState("80");
  const [tag1, setTag1] = useState("execution");
  const [tag2, setTag2] = useState("stability");
  const [endpointUri, setEndpointUri] = useState("https://api.patricon.local/feedback");
  const [fileUri, setFileUri] = useState("ipfs://feedback/example");
  const [fileHash, setFileHash] = useState<`0x${string}`>("0x0000000000000000000000000000000000000000000000000000000000000001");
  const [status, setStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [statusMessage, setStatusMessage] = useState<string>();

  const reputation = useErc8004Reputation(selectedAgentId);
  const validation = useErc8004Validation(selectedAgentId);

  const feedbackRows = useMemo(() => {
    const data = reputation.getFeedbackEntries.data as
      | readonly [
          readonly `0x${string}`[],
          readonly bigint[],
          readonly bigint[],
          readonly number[],
          readonly string[],
          readonly string[],
          readonly boolean[]
        ]
      | undefined;
    if (!data) {
      return [];
    }

    const clients = data[0];
    const indexes = data[1];
    const values = data[2];
    const tag1s = data[4];
    const tag2s = data[5];

    return clients.map((client, index) => ({
      client,
      feedbackIndex: indexes[index]?.toString() ?? "0",
      score: Number(values[index] ?? 0n),
      tag1: tag1s[index] ?? "",
      tag2: tag2s[index] ?? ""
    }));
  }, [reputation.getFeedbackEntries.data]);

  const recentValidationHashes = useMemo(() => {
    const hashes = validation.agentValidations.data as readonly `0x${string}`[] | undefined;
    if (!hashes) {
      return [];
    }
    return [...hashes].reverse().slice(0, 10);
  }, [validation.agentValidations.data]);

  const totalAgents = (identity.totalAgents.data as bigint | undefined) ?? 0n;
  const start = page * pageSize + 1;
  const ids = useMemo(() => {
    const out: bigint[] = [];
    for (let i = 0; i < pageSize; i += 1) {
      const tokenId = BigInt(start + i);
      if (tokenId > totalAgents) {
        break;
      }
      out.push(tokenId);
    }
    return out;
  }, [pageSize, start, totalAgents]);

  const identityRegistryAddress = getContractAddress(chainId, "erc8004IdentityRegistry");

  const identityRows = useReadContracts({
    contracts: identityRegistryAddress
      ? ids.flatMap((agentId) => ([
          {
            address: identityRegistryAddress,
            abi: ERC8004IdentityRegistryAbi,
            functionName: "ownerOf",
            args: [agentId]
          },
          {
            address: identityRegistryAddress,
            abi: ERC8004IdentityRegistryAbi,
            functionName: "tokenURI",
            args: [agentId]
          }
        ]))
      : undefined,
    allowFailure: true,
    query: {
      enabled: Boolean(identityRegistryAddress && ids.length > 0)
    }
  });

  const validationRows = useReadContracts({
    contracts: validation.address
      ? recentValidationHashes.map((hash) => ({
          address: validation.address,
          abi: ERC8004ValidationRegistryAbi,
          functionName: "getValidationStatus",
          args: [hash]
        }))
      : undefined,
    query: {
      enabled: Boolean(validation.address && recentValidationHashes.length > 0)
    }
  });

  const rows = useMemo(() => {
    return ids.map((id, index) => {
      const ownerIndex = index * 2;
      const uriIndex = ownerIndex + 1;
      const ownerResult = identityRows.data?.[ownerIndex]?.result as `0x${string}` | undefined;
      const uriResult = identityRows.data?.[uriIndex]?.result as string | undefined;
      const safeUri = uriResult ? sanitizeExternalUrl(uriResult) : undefined;

      return {
        id,
        owner: ownerResult,
        uri: safeUri,
        uriLabel: safeUri ? sanitizeText(safeUri, 96) : undefined
      };
    });
  }, [ids, identityRows.data]);

  const validationStatusRows = useMemo(() => {
    return recentValidationHashes.map((hash, index) => {
      const row = validationRows.data?.[index]?.result as
        | readonly [`0x${string}`, bigint, number, `0x${string}`, string, bigint]
        | undefined;
      const validator = row?.[0];
      return {
        hash,
        validator,
        response: row?.[2],
        trusted: isTrustedValidator(validator)
      };
    });
  }, [recentValidationHashes, validationRows.data]);

  const fees = useEstimateFeesPerGas();

  async function handleSubmitFeedback() {
    if (!selectedAgentId) {
      setStatus("failed");
      setStatusMessage("Select an agent first.");
      return;
    }

    if (reputation.disabledReason) {
      setStatus("failed");
      setStatusMessage(reputation.disabledReason);
      return;
    }

    const safeEndpointUri = sanitizeExternalUrl(endpointUri);
    const safeFileUri = sanitizeExternalUrl(fileUri);
    if (!safeEndpointUri || !safeFileUri) {
      setStatus("failed");
      setStatusMessage("Endpoint URI and file URI must be valid http(s) or ipfs URLs.");
      return;
    }

    try {
      setStatus("pending");
      setStatusMessage("Submitting feedback transaction...");

      await reputation.submitFeedback({
        agentId: selectedAgentId,
        value: toBigIntSafe(feedbackScore, 0n),
        valueDecimals: 0,
        tag1: sanitizeText(tag1, 64),
        tag2: sanitizeText(tag2, 64),
        endpointURI: safeEndpointUri,
        fileURI: safeFileUri,
        fileHash
      });

      setStatus("confirmed");
      setStatusMessage("Feedback submitted.");
    } catch (error) {
      setStatus("failed");
      setStatusMessage(error instanceof Error ? error.message : "Failed to submit feedback.");
    }
  }

  return (
    <PageShell title="Agent Trust Explorer" subtitle="ERC-8004 identity, reputation, and validation analysis.">
      <section className="app-card">
        <h2 style={{ marginTop: 0 }}>Agent Identity List</h2>
        <table className="app-table">
          <thead>
            <tr>
              <th>Agent ID</th>
              <th>Owner</th>
              <th>Agent URI</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id.toString()}>
                <td>{row.id.toString()}</td>
                <td>{row.owner ?? "-"}</td>
                <td>{row.uri ? <a href={row.uri} target="_blank" rel="noreferrer">{row.uriLabel}</a> : "-"}</td>
                <td>
                  <button type="button" className="app-btn" onClick={() => setSelectedAgentId(row.id)}>
                    View trust data
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="app-inline" style={{ marginTop: "0.7rem" }}>
          <button className="app-btn" type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Prev</button>
          <button className="app-btn" type="button" disabled={BigInt(start + pageSize) > totalAgents} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </section>

      <section className="app-grid app-grid-2" style={{ marginTop: "1rem" }}>
        <article className="app-card">
          <h2 style={{ marginTop: 0 }}>Agent Reputation</h2>
          <p className="app-hint">
            Aggregated Score: {
              reputation.getAggregatedScore.data
                ? `${Number((reputation.getAggregatedScore.data as readonly [bigint, bigint, number])[1] ?? 0n)}/100`
                : "-"
            }
          </p>
          <p className="app-hint">Feedback entries are lazy-loaded from registry views.</p>
          <table className="app-table" style={{ marginTop: "0.5rem" }}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Score</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {feedbackRows.slice(0, 10).map((row) => (
                <tr key={`${row.client}-${row.feedbackIndex}`}>
                  <td>{row.client}</td>
                  <td>{row.score}</td>
                  <td>{sanitizeText(row.tag1, 48)} / {sanitizeText(row.tag2, 48)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="app-card">
          <h2 style={{ marginTop: 0 }}>Agent Validation</h2>
          <p className="app-hint">Latest request hash: {validation.getLatestValidation.hash ?? "-"}</p>
          <p className="app-hint">Validation details are fetched only for selected agent.</p>
          <table className="app-table" style={{ marginTop: "0.5rem" }}>
            <thead>
              <tr>
                <th>Request Hash</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {validationStatusRows.map((row) => (
                <tr key={row.hash}>
                  <td>{row.hash}</td>
                  <td>
                    <span className="app-hint">
                      {row.trusted ? "Trusted validator" : "Untrusted validator"}
                    </span>
                    {row.validator ? <div className="app-hint">{row.validator}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="app-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Submit Feedback</h2>
        <p className="app-hint">Estimated max fee per gas: {fees.data?.maxFeePerGas?.toString() ?? "N/A"}</p>
        <form
          className="app-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmitFeedback();
          }}
        >
          <label>
            Score (0-100)
            <input type="number" min={0} max={100} value={feedbackScore} onChange={(event) => setFeedbackScore(event.target.value)} />
          </label>
          <label>
            Tag 1
            <input value={tag1} onChange={(event) => setTag1(event.target.value)} />
          </label>
          <label>
            Tag 2
            <input value={tag2} onChange={(event) => setTag2(event.target.value)} />
          </label>
          <label>
            Endpoint URI
            <input value={endpointUri} onChange={(event) => setEndpointUri(event.target.value)} />
          </label>
          <label>
            File URI
            <input value={fileUri} onChange={(event) => setFileUri(event.target.value)} />
          </label>
          <label>
            File hash
            <input value={fileHash} onChange={(event) => setFileHash(event.target.value as `0x${string}`)} />
          </label>
          <button className="app-btn app-btn-primary" type="submit">Submit feedback</button>
        </form>
      </section>

      <div style={{ marginTop: "1rem" }}>
        <TxToast status={status} message={statusMessage} />
      </div>
    </PageShell>
  );
}
