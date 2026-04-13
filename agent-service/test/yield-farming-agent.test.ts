import { describe, expect, it } from "vitest";
import { YieldFarmingStrategy } from "../src/strategies/yield-farming-strategy.js";

const strategy = new YieldFarmingStrategy({
  apyDepositThresholdBps: 1_000,
  apyWithdrawThresholdBps: 700,
  maxAllocationBps: 4_000,
  maxExposure: 5_000n,
  defaultTradeAmount: 500n,
  whitelistedTokenIds: [11n, 42n]
});

describe("YieldFarmingStrategy", () => {
  it("proposes deposit when APY is high and exposure is under allocation limit", () => {
    const decision = strategy.decide({
      poolId: 11n,
      apyBps: 1_200,
      currentExposure: 900n,
      maxExposure: 5_000n,
      timestamp: 1_710_000_100n
    });

    expect(decision.action).toBe("deposit");
    expect(decision.amount).toBe(500n);
  });

  it("proposes withdraw when APY drops below lower threshold", () => {
    const decision = strategy.decide({
      poolId: 11n,
      apyBps: 650,
      currentExposure: 1_000n,
      maxExposure: 5_000n,
      timestamp: 1_710_000_200n
    });

    expect(decision.action).toBe("withdraw");
  });

  it("proposes rebalance when exposure breaches configured limit", () => {
    const decision = strategy.decide({
      poolId: 11n,
      apyBps: 900,
      currentExposure: 5_100n,
      maxExposure: 5_000n,
      timestamp: 1_710_000_300n
    });

    expect(decision.action).toBe("rebalance");
    expect(decision.targetTokenId).toBe(42n);
  });
});
