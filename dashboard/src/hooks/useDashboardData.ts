import { useEffect, useState } from "react";
import { loadDashboardData, type DashboardData } from "../lib/dashboard-data";

export function useDashboardData(networkName: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await loadDashboardData(networkName);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [networkName, reloadKey]);

  return {
    data,
    loading,
    error,
    retry: () => setReloadKey((value) => value + 1)
  };
}