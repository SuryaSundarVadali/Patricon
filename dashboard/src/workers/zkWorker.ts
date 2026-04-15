/// <reference lib="webworker" />

import { generatePolicyProof } from "../lib/zk/policyProof";
import { serializeForWorker } from "../lib/zk/proofUtils";
import { generateZkIdProof } from "../lib/zk/zkIdProof";
import type { ZkWorkerRequest, ZkWorkerResponse } from "../lib/zk/workerTypes";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<ZkWorkerRequest>) => {
  const request = event.data;
  const startedAt = performance.now();

  try {
    const bundle = request.type === "ZK_ID"
      ? await generateZkIdProof(request.input)
      : await generatePolicyProof(request.input);

    const serialized = serializeForWorker(bundle);
    const message: ZkWorkerResponse = {
      requestId: request.requestId,
      ok: true,
      elapsedMs: performance.now() - startedAt,
      payload: serialized.buffer
    };

    self.postMessage(message, [serialized.buffer]);
  } catch (error) {
    const message: ZkWorkerResponse = {
      requestId: request.requestId,
      ok: false,
      error: error instanceof Error ? error.message : "Proof generation failed."
    };
    self.postMessage(message);
  }
};

export {};
