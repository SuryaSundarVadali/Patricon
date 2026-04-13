import { describe, expect, it } from "vitest";
import { evaluateYieldPolicy } from "../src/agents/yield-farming-agent.js";

describe("evaluateYieldPolicy", () => {
  it("returns execute=true when APR exceeds threshold", () => {
    expect(evaluateYieldPolicy(1100, 900).execute).toBe(true);
  });

  it("returns hold strategy when APR is below threshold", () => {
    expect(evaluateYieldPolicy(700, 900).strategyId).toBe("hold");
  });
});
