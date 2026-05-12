import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryBackend } from "./memory.js";
import type { StateBackend } from "./types.js";

describe("alerts", () => {
  let b: StateBackend;
  beforeEach(() => {
    b = createMemoryBackend();
  });

  it("inserts and reads back recent", async () => {
    await b.alertInsert("u1", { source: "test", symbol: "AAPL", payload: { price: 100 } });
    await b.alertInsert("u1", { source: "test", symbol: "MSFT", payload: { price: 200 } });
    const recent = await b.alertsRecent("u1", 10);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.symbol).toBe("MSFT"); // newest first
    expect(recent[1]?.symbol).toBe("AAPL");
  });

  it("scopes alerts by user", async () => {
    await b.alertInsert("u1", { source: "t", symbol: "AAPL", payload: {} });
    await b.alertInsert("u2", { source: "t", symbol: "TSLA", payload: {} });
    expect(await b.alertsRecent("u1", 10)).toHaveLength(1);
    expect(await b.alertsRecent("u2", 10)).toHaveLength(1);
  });

  it("webhook token round-trip resolves user", async () => {
    const token = await b.webhookTokenRotate("u-alpha");
    expect(await b.userIdByWebhookToken(token)).toBe("u-alpha");
    // After rotation, old token is invalidated
    const token2 = await b.webhookTokenRotate("u-alpha");
    expect(await b.userIdByWebhookToken(token)).toBeNull();
    expect(await b.userIdByWebhookToken(token2)).toBe("u-alpha");
  });

  it("respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await b.alertInsert("u1", { source: "t", symbol: "X", payload: { i } });
    }
    expect(await b.alertsRecent("u1", 3)).toHaveLength(3);
  });
});
