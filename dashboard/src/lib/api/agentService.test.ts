import { afterEach, describe, expect, it, vi } from "vitest";

import { approveAction, getAgentState, getGlobalStats, getYieldHistory, rejectAction } from "./agentService";

describe("agentService api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns fallbacks for resilient read endpoints on fetch failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const [stats, state, history] = await Promise.all([
      getGlobalStats(),
      getAgentState("0x1111111111111111111111111111111111111111"),
      getYieldHistory("0x1111111111111111111111111111111111111111")
    ]);

    expect(stats).toEqual({ tvlUsd: 0, averageReputation: 0 });
    expect(state.overview.passportStatus).toBe("NONE");
    expect(history).toEqual([]);
  });

  it("throws on non-ok write responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(
      approveAction("0x1111111111111111111111111111111111111111", "action-1", {})
    ).rejects.toThrow(/request failed/i);

    await expect(
      rejectAction("0x1111111111111111111111111111111111111111", "action-1", "no")
    ).rejects.toThrow(/request failed/i);
  });

  it("calls expected endpoint paths for write APIs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ requestId: "req-1" })
    });
    vi.stubGlobal("fetch", fetchMock);

    await approveAction("0x1111111111111111111111111111111111111111", "action-2", {});
    await rejectAction("0x1111111111111111111111111111111111111111", "action-3", "invalid");

    const calls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/v1/agents/0x1111111111111111111111111111111111111111/actions/action-2/approve"))).toBe(true);
    expect(calls.some((url) => url.includes("/api/v1/agents/0x1111111111111111111111111111111111111111/actions/action-3/reject"))).toBe(true);
  });
});
