import { describe, expect, it, vi } from "vitest";
import type { Signer } from "ethers";
import ZKPolicyEnforcer, { type AgentAction } from "../ZKPolicyEnforcer.js";
import type ProverService from "../ProverService.js";
import type { ZKProof } from "../ProverService.js";
import { CircuitNotFoundError, ZKPolicyViolationError } from "../errors.js";

const mockCallData =
  "[\"1\",\"2\"],[[\"3\",\"4\"],[\"5\",\"6\"]],[\"7\",\"8\"],[\"9\"]";

vi.mock("snarkjs", () => ({
  groth16: {
    exportSolidityCallData: vi.fn(async () => mockCallData)
  }
}));

function createProof(circuitName: string): ZKProof {
  return {
    circuitName,
    proof: {
      pi_a: ["1", "2", "1"],
      pi_b: [["3", "4"], ["5", "6"], ["1", "0"]],
      pi_c: ["7", "8", "1"],
      protocol: "groth16"
    },
    publicSignals: ["9"]
  };
}

function createAction(): AgentAction {
  return {
    tradeValue: 500n,
    maxLimit: 1000n,
    minLimit: 100n,
    jurisdiction: 1,
    kycTier: 2,
    requiredTier: 2
  };
}

describe("ZKPolicyEnforcer", () => {
  it("valid proofs -> transaction submitted", async () => {
    const txReceipt = { hash: "0xreceipt" };
    const wait = vi.fn().mockResolvedValue(txReceipt);
    const tx = { hash: "0xtx", wait };
    const verifyAndExecuteAction = vi.fn().mockResolvedValue(tx);

    const zkGateContract = {
      connect: vi.fn().mockReturnValue({ verifyAndExecuteAction })
    } as any;

    const proverService = {
      generateAgentPolicyProof: vi.fn().mockResolvedValue(createProof("agent_policy")),
      generateKYCProof: vi.fn().mockResolvedValue(createProof("kyc_threshold")),
      generateJurisdictionProof: vi.fn().mockResolvedValue(createProof("jurisdiction_check")),
      verifyProof: vi.fn().mockResolvedValue(true)
    } as unknown as ProverService;

    const enforcer = new ZKPolicyEnforcer(proverService, zkGateContract);
    const signer = {} as Signer;

    const receipt = await enforcer.enforceAndExecute("0x0000000000000000000000000000000000000011", createAction(), signer);

    expect(receipt).toEqual(txReceipt);
    expect(verifyAndExecuteAction).toHaveBeenCalledTimes(1);
  });

  it("invalid policy proof -> ZKPolicyViolationError thrown, no tx submitted", async () => {
    const verifyAndExecuteAction = vi.fn();
    const zkGateContract = {
      connect: vi.fn().mockReturnValue({ verifyAndExecuteAction })
    } as any;

    const proverService = {
      generateAgentPolicyProof: vi.fn().mockResolvedValue(createProof("agent_policy")),
      generateKYCProof: vi.fn().mockResolvedValue(createProof("kyc_threshold")),
      generateJurisdictionProof: vi.fn().mockResolvedValue(createProof("jurisdiction_check")),
      verifyProof: vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
    } as unknown as ProverService;

    const enforcer = new ZKPolicyEnforcer(proverService, zkGateContract);

    await expect(
      enforcer.enforceAndExecute(
        "0x0000000000000000000000000000000000000011",
        createAction(),
        {} as Signer
      )
    ).rejects.toBeInstanceOf(ZKPolicyViolationError);

    expect(verifyAndExecuteAction).not.toHaveBeenCalled();
  });

  it("invalid KYC proof -> ZKPolicyViolationError thrown", async () => {
    const verifyAndExecuteAction = vi.fn();
    const zkGateContract = {
      connect: vi.fn().mockReturnValue({ verifyAndExecuteAction })
    } as any;

    const proverService = {
      generateAgentPolicyProof: vi.fn().mockResolvedValue(createProof("agent_policy")),
      generateKYCProof: vi.fn().mockResolvedValue(createProof("kyc_threshold")),
      generateJurisdictionProof: vi.fn().mockResolvedValue(createProof("jurisdiction_check")),
      verifyProof: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
    } as unknown as ProverService;

    const enforcer = new ZKPolicyEnforcer(proverService, zkGateContract);

    await expect(
      enforcer.enforceAndExecute(
        "0x0000000000000000000000000000000000000011",
        createAction(),
        {} as Signer
      )
    ).rejects.toBeInstanceOf(ZKPolicyViolationError);

    expect(verifyAndExecuteAction).not.toHaveBeenCalled();
  });

  it("circuit not found -> CircuitNotFoundError thrown", async () => {
    const verifyAndExecuteAction = vi.fn();
    const zkGateContract = {
      connect: vi.fn().mockReturnValue({ verifyAndExecuteAction })
    } as any;

    const proverService = {
      generateAgentPolicyProof: vi.fn().mockResolvedValue(createProof("agent_policy")),
      generateKYCProof: vi.fn().mockResolvedValue(createProof("kyc_threshold")),
      generateJurisdictionProof: vi.fn().mockResolvedValue(createProof("jurisdiction_check")),
      verifyProof: vi.fn().mockRejectedValueOnce(new CircuitNotFoundError("agent_policy"))
    } as unknown as ProverService;

    const enforcer = new ZKPolicyEnforcer(proverService, zkGateContract);

    await expect(
      enforcer.enforceAndExecute(
        "0x0000000000000000000000000000000000000011",
        createAction(),
        {} as Signer
      )
    ).rejects.toBeInstanceOf(CircuitNotFoundError);

    expect(verifyAndExecuteAction).not.toHaveBeenCalled();
  });
});
