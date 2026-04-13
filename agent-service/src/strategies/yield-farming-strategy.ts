import type { PoolState } from "../clients/pool-state-client.js";

export type StrategyActionType = "deposit" | "withdraw" | "rebalance" | "hold";

export type StrategyDecision = {
  action: StrategyActionType;
  amount: bigint;
  tokenId: bigint;
  targetTokenId?: bigint;
  reason: string;
};

export type YieldStrategyConfig = {
  apyDepositThresholdBps: number;
  apyWithdrawThresholdBps: number;
  maxAllocationBps: number;
  maxExposure: bigint;
  defaultTradeAmount: bigint;
  whitelistedTokenIds: bigint[];
};

/**
 * Deterministic rule-based strategy for Patricon yield-farming operations.
 */
export class YieldFarmingStrategy {
  constructor(private readonly config: YieldStrategyConfig) {}

  decide(state: PoolState): StrategyDecision {
    const tokenId = this.config.whitelistedTokenIds[0] ?? state.poolId;
    const utilizationBps = Number((state.currentExposure * 10_000n) / (this.config.maxExposure || 1n));

    if (
      state.apyBps > this.config.apyDepositThresholdBps
      && utilizationBps < this.config.maxAllocationBps
      && state.currentExposure < this.config.maxExposure
    ) {
      return {
        action: "deposit",
        amount: this.config.defaultTradeAmount,
        tokenId,
        reason: "APY above deposit threshold and exposure below max allocation"
      };
    }

    if (state.apyBps < this.config.apyWithdrawThresholdBps) {
      return {
        action: "withdraw",
        amount: this.config.defaultTradeAmount,
        tokenId,
        reason: "APY below withdraw threshold"
      };
    }

    if (state.currentExposure > this.config.maxExposure) {
      const targetTokenId = this.config.whitelistedTokenIds[1] ?? tokenId;
      return {
        action: "rebalance",
        amount: this.config.defaultTradeAmount,
        tokenId,
        targetTokenId,
        reason: "Exposure exceeded configured limit"
      };
    }

    return {
      action: "hold",
      amount: 0n,
      tokenId,
      reason: "No policy-compliant action required"
    };
  }
}