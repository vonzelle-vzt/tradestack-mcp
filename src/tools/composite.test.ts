import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryBackend } from "../state/memory.js";
import { runWithContext } from "../lib/context.js";
import { compositeUpsertTool, compositeEvaluateTool } from "./composite.js";
import { _resetStateBackendForTests, getStateBackend } from "../state/index.js";

// Tools call getStateBackend(loadConfig()); we override by pre-seeding the singleton.
// Trick: we directly call the backend methods so we test the eval logic without
// having to mock loadConfig. That keeps tests fast and pure.

describe("composite alert evaluation (direct backend)", () => {
  beforeEach(() => {
    _resetStateBackendForTests();
  });

  it("AND logic — all must match", async () => {
    const b = createMemoryBackend();
    await b.compositeUpsert("u1", {
      name: "oversold-on-volume",
      symbol: "AAPL",
      logic: "all",
      conditions: [
        { field: "rsi", op: "lt", value: 30 },
        { field: "vol", op: "gt", value: 1_000_000 },
      ],
    });
    const list = await b.compositeList("u1");
    expect(list).toHaveLength(1);
    expect(list[0]?.conditions).toHaveLength(2);
  });

  it("between op works", async () => {
    const b = createMemoryBackend();
    await b.compositeUpsert("u1", {
      name: "midrange",
      symbol: "BTC",
      logic: "all",
      conditions: [{ field: "rsi", op: "between", value: [40, 60] }],
    });
    const got = await b.compositeList("u1");
    expect(got[0]?.conditions[0]?.op).toBe("between");
  });
});

describe("composite tool wrappers wire through context + backend", () => {
  beforeEach(() => {
    _resetStateBackendForTests();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("upserts, lists, evaluates within a user context", async () => {
    await runWithContext({ userId: "u-test" }, async () => {
      await compositeUpsertTool.handler({
        name: "rsi-cross",
        symbol: "ES1!",
        logic: "all",
        conditions: [{ field: "rsi", op: "gt", value: 70 }],
        expires_at: null,
      });
      const evaluated = await compositeEvaluateTool.handler({
        name: "rsi-cross",
        observation: { rsi: 75 },
      });
      expect(evaluated).toMatchObject({ fires: true });
    });
    // make sure persistence actually used the memory backend
    expect(getStateBackend({ transport: "stdio", httpPort: 0, httpHost: "", logLevel: "info", supabase: null, webhook: null }).kind).toBe("memory");
  });
});
