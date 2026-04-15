import { useCallback, useEffect, useRef, useState } from "react";

import { deserializeFromWorker } from "../lib/zk/proofUtils";
import type { ContractProofBundle, ZkIdInput } from "../lib/zk/zkTypes";
import type { ZkWorkerRequest, ZkWorkerResponse } from "../lib/zk/workerTypes";

type Status = "idle" | "running" | "success" | "error";

type WorkerResult = {
  proof: ContractProofBundle<6>;
  elapsedMs: number;
};

function nextRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useZkIdProofWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../workers/zkWorker.ts", import.meta.url), { type: "module" });

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const generate = useCallback((input: ZkIdInput): Promise<WorkerResult> => {
    if (!workerRef.current) {
      throw new Error("ZK worker not initialized");
    }

    setStatus("running");
    setError(null);

    const requestId = nextRequestId();

    return new Promise<WorkerResult>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) {
        setStatus("error");
        setError("ZK worker is unavailable");
        reject(new Error("ZK worker is unavailable"));
        return;
      }

      const handleMessage = (event: MessageEvent<ZkWorkerResponse>) => {
        if (event.data.requestId !== requestId) {
          return;
        }

        worker.removeEventListener("message", handleMessage);

        if (!event.data.ok) {
          const workerError = event.data.error ?? "Proof generation failed";
          setStatus("error");
          setError(workerError);
          reject(new Error(workerError));
          return;
        }

        const parsed = deserializeFromWorker(event.data.payload) as ContractProofBundle<6>;
        setElapsedMs(event.data.elapsedMs);
        setStatus("success");
        resolve({ proof: parsed, elapsedMs: event.data.elapsedMs });
      };

      worker.addEventListener("message", handleMessage);

      const request: ZkWorkerRequest = {
        requestId,
        type: "ZK_ID",
        input
      };

      worker.postMessage(request);
    });
  }, []);

  return { generate, status, elapsedMs, error };
}
