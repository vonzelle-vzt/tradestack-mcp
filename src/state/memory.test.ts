import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryBackend } from "./memory.js";
import type { StateBackend } from "./types.js";

describe("memory state backend", () => {
  let b: StateBackend;
  beforeEach(() => {
    b = createMemoryBackend();
  });

  it("starts empty", async () => {
    expect(await b.watchlistGet("u1", "anything")).toBeNull();
    expect(await b.watchlistList("u1")).toEqual([]);
  });

  it("upsert + get round-trip", async () => {
    await b.watchlistUpsert("u1", { name: "tech", symbols: ["AAPL", "MSFT"], updated_at: "" });
    const got = await b.watchlistGet("u1", "tech");
    expect(got?.symbols).toEqual(["AAPL", "MSFT"]);
    expect(got?.updated_at).toMatch(/T/);
  });

  it("add is idempotent on duplicate symbol", async () => {
    await b.watchlistAdd("u1", "tech", "AAPL");
    await b.watchlistAdd("u1", "tech", "AAPL");
    const wl = await b.watchlistGet("u1", "tech");
    expect(wl?.symbols).toEqual(["AAPL"]);
  });

  it("scopes by user", async () => {
    await b.watchlistAdd("u1", "tech", "AAPL");
    await b.watchlistAdd("u2", "tech", "TSLA");
    expect((await b.watchlistGet("u1", "tech"))?.symbols).toEqual(["AAPL"]);
    expect((await b.watchlistGet("u2", "tech"))?.symbols).toEqual(["TSLA"]);
  });

  it("remove preserves empty watchlist", async () => {
    await b.watchlistAdd("u1", "tech", "AAPL");
    await b.watchlistRemove("u1", "tech", "AAPL");
    const list = await b.watchlistList("u1");
    expect(list).toHaveLength(1);
    expect(list[0]?.size).toBe(0);
  });

  it("webhook token rotates to new value", async () => {
    const t1 = await b.webhookTokenRotate("u1");
    const t2 = await b.webhookTokenRotate("u1");
    expect(t1).not.toBe(t2);
    expect(await b.webhookTokenGet("u1")).toBe(t2);
  });
});
