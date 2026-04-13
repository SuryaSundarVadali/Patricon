export type SettlementAction = {
  paymentRef: string;
  agent: string;
  payer: string;
  payee: string;
  asset: string;
  amount: bigint;
  tokenId: bigint;
  timestamp: bigint;
  tradeNonce: bigint;
  reason: string;
};

export type SettlementActionInput = {
  agent: string;
  payer: string;
  payee: string;
  asset: string;
  tokenId: bigint;
  realizedYield: bigint;
  shareBps: number;
  policyMaxTrade: bigint;
  timestamp: bigint;
  tradeNonce: bigint;
};

/**
 * Derives a deterministic settlement action constrained by configured policy limits.
 */
export function buildSettlementAction(input: SettlementActionInput): SettlementAction | null {
  if (input.realizedYield <= 0n) {
    return null;
  }

  const shareAmount = (input.realizedYield * BigInt(input.shareBps)) / 10_000n;
  const cappedAmount = shareAmount > input.policyMaxTrade ? input.policyMaxTrade : shareAmount;

  if (cappedAmount <= 0n) {
    return null;
  }

  return {
    paymentRef: `patricon-payment-${input.timestamp.toString()}-${input.tradeNonce.toString()}`,
    agent: input.agent,
    payer: input.payer,
    payee: input.payee,
    asset: input.asset,
    amount: cappedAmount,
    tokenId: input.tokenId,
    timestamp: input.timestamp,
    tradeNonce: input.tradeNonce,
    reason: "Settlement share of realized yield"
  };
}