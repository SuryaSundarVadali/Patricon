export type YieldDecision = {
  execute: boolean;
  strategyId: string;
};

export function evaluateYieldPolicy(currentAprBps: number, minAprBps: number): YieldDecision {
  const execute = currentAprBps >= minAprBps;
  return {
    execute,
    strategyId: execute ? "stable-yield-v1" : "hold"
  };
}
