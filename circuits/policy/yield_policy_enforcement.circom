pragma circom 2.1.6;

include "../common/poseidon_wrappers.circom";
include "../common/range_checks.circom";

template YieldPolicyEnforcement() {
    // Public policy parameters and state.
    signal input maxTrade;
    signal input dailyVolumeLimit;
    signal input minDelay;
    signal input allowedTokenIdA;
    signal input allowedTokenIdB;

    signal input previousCumulativeVolume;
    signal input previousTradeTimestamp;
    signal input previousNonce;

    // Public action context.
    signal input tokenId;
    signal input newTradeTimestamp;
    signal input tradeNonce;

    // Private trade witness.
    signal input tradeAmount;

    // Public outputs for chaining state and on-chain verification wiring.
    signal output updatedCumulativeVolume;
    signal output updatedNonce;
    signal output policyHash;

    // Trade amount and policy parameters remain in 64-bit range.
    component maxTradeRange = AssertLeq64();
    maxTradeRange.left <== maxTrade;
    maxTradeRange.right <== 18446744073709551615;

    component dailyCapRange = AssertLeq64();
    dailyCapRange.left <== dailyVolumeLimit;
    dailyCapRange.right <== 18446744073709551615;

    component delayRange = AssertLeq64();
    delayRange.left <== minDelay;
    delayRange.right <== 18446744073709551615;

    component tradeRange = AssertLeq64();
    tradeRange.left <== tradeAmount;
    tradeRange.right <== 18446744073709551615;

    // Rule 1: Max single trade size.
    component tradeVsMax = AssertLeq64();
    tradeVsMax.left <== tradeAmount;
    tradeVsMax.right <== maxTrade;

    // Rule 2: Daily cumulative volume cap via accumulator update.
    updatedCumulativeVolume <== previousCumulativeVolume + tradeAmount;

    component cumulativeVsCap = AssertLeq64();
    cumulativeVsCap.left <== updatedCumulativeVolume;
    cumulativeVsCap.right <== dailyVolumeLimit;

    // Rule 3: Min delay between trades.
    component delayGuard = AssertLeq64();
    delayGuard.left <== previousTradeTimestamp + minDelay;
    delayGuard.right <== newTradeTimestamp;

    // Rule 4: Token whitelist membership over two allowed token IDs.
    (tokenId - allowedTokenIdA) * (tokenId - allowedTokenIdB) === 0;

    // Replay protection: enforce strictly increasing nonce.
    updatedNonce <== previousNonce + 1;
    updatedNonce === tradeNonce;

    component nonceRange = AssertLeq64();
    nonceRange.left <== tradeNonce;
    nonceRange.right <== 18446744073709551615;

    // Public hash that commits the active policy parameters.
    component pHash = Poseidon5();
    pHash.in[0] <== maxTrade;
    pHash.in[1] <== dailyVolumeLimit;
    pHash.in[2] <== minDelay;
    pHash.in[3] <== allowedTokenIdA;
    pHash.in[4] <== allowedTokenIdB;
    policyHash <== pHash.out;
}

component main {
    public [
        maxTrade,
        dailyVolumeLimit,
        minDelay,
        allowedTokenIdA,
        allowedTokenIdB,
        previousCumulativeVolume,
        previousTradeTimestamp,
        previousNonce,
        tokenId,
        newTradeTimestamp,
        tradeNonce
    ]
} = YieldPolicyEnforcement();