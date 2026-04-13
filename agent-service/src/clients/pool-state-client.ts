export type PoolState = {
  poolId: bigint;
  apyBps: number;
  currentExposure: bigint;
  maxExposure: bigint;
  timestamp: bigint;
};

export interface PoolStateClient {
  getCurrentState(): Promise<PoolState>;
}

/**
 * Simulated data source for local and dry-run operation.
 */
export class SimulatedPoolStateClient implements PoolStateClient {
  private tick = 0;

  async getCurrentState(): Promise<PoolState> {
    this.tick += 1;
    const apySeries = [1200, 980, 760, 640, 1100];
    const exposureSeries = [900n, 1200n, 1600n, 2200n, 1400n];
    const index = (this.tick - 1) % apySeries.length;

    return {
      poolId: 11n,
      apyBps: apySeries[index],
      currentExposure: exposureSeries[index],
      maxExposure: 5_000n,
      timestamp: BigInt(Math.floor(Date.now() / 1000))
    };
  }
}

/**
 * Placeholder live data source. Swap internals with protocol-specific API/RPC integrations.
 */
export class LivePoolStateClient implements PoolStateClient {
  constructor(private readonly fallbackPoolId: bigint, private readonly maxExposure: bigint) {}

  async getCurrentState(): Promise<PoolState> {
    return {
      poolId: this.fallbackPoolId,
      apyBps: 1000,
      currentExposure: 1000n,
      maxExposure: this.maxExposure,
      timestamp: BigInt(Math.floor(Date.now() / 1000))
    };
  }
}