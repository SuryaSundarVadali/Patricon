export async function measure<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; elapsedMs: number }> {
  const start = performance.now();
  const result = await fn();
  const elapsedMs = performance.now() - start;

  const nodeEnv = typeof process !== "undefined" ? process.env.NODE_ENV : undefined;
  const isDev = nodeEnv === "development" || import.meta.env.DEV;

  if (isDev) {
    console.debug(`[perf] ${label}: ${elapsedMs.toFixed(1)}ms`);
  }

  return { result, elapsedMs };
}
