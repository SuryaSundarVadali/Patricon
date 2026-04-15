import type {
  ContractProofBundle,
  PolicyProofInput,
  ZkIdInput
} from "./zkTypes";

export type ZkWorkerRequest =
  | { requestId: string; type: "ZK_ID"; input: ZkIdInput }
  | { requestId: string; type: "POLICY"; input: PolicyProofInput };

export type ZkWorkerSuccess = {
  requestId: string;
  ok: true;
  elapsedMs: number;
  payload: ArrayBufferLike;
};

export type ZkWorkerFailure = {
  requestId: string;
  ok: false;
  error: string;
};

export type ZkWorkerResponse = ZkWorkerSuccess | ZkWorkerFailure;

export type ZkWorkerProofResult = ContractProofBundle<6> | ContractProofBundle<14>;
