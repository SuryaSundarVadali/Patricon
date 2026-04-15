import { describe, expect, it } from "vitest";

import { buildRegisterAgentWriteCall, buildUpdateAgentUriWriteCall } from "./useErc8004Identity";
import { buildSubmitFeedbackWriteCall } from "./useErc8004Reputation";
import { buildRecordValidationWriteCall, buildValidationResponseWriteCall } from "./useErc8004Validation";

const mockAddress = "0x1111111111111111111111111111111111111111" as const;

describe("ERC-8004 hook call builders", () => {
  it("builds identity write call with expected address and function", () => {
    const register = buildRegisterAgentWriteCall(mockAddress, "ipfs://agent-card");
    const update = buildUpdateAgentUriWriteCall(mockAddress, 1n, "ipfs://agent-card-2");

    expect(register.address).toBe(mockAddress);
    expect(register.functionName).toBe("register");
    expect(update.address).toBe(mockAddress);
    expect(update.functionName).toBe("setAgentURI");
  });

  it("builds reputation and validation calls with expected names", () => {
    const feedback = buildSubmitFeedbackWriteCall(mockAddress, {
      agentId: 1n,
      value: 80n,
      valueDecimals: 0,
      tag1: "execution",
      tag2: "risk",
      endpointURI: "https://api.example.com/feedback",
      fileURI: "ipfs://feedback",
      fileHash: "0x0000000000000000000000000000000000000000000000000000000000000001"
    });

    const record = buildRecordValidationWriteCall(mockAddress, {
      validatorAddress: mockAddress,
      agentId: 1n,
      proofURI: "ipfs://proof",
      proofHash: "0x0000000000000000000000000000000000000000000000000000000000000002"
    });

    const respond = buildValidationResponseWriteCall(mockAddress, {
      requestHash: "0x0000000000000000000000000000000000000000000000000000000000000003",
      result: 100,
      responseURI: "ipfs://response",
      responseHash: "0x0000000000000000000000000000000000000000000000000000000000000004",
      tag: "trusted"
    });

    expect(feedback.functionName).toBe("giveFeedback");
    expect(record.functionName).toBe("validationRequest");
    expect(respond.functionName).toBe("validationResponse");
  });
});
