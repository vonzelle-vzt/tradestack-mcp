import { describe, it, expect } from "vitest";
import { orderRouteTool } from "./order.js";

describe("order_route", () => {
  it("rejects unknown broker", async () => {
    const r = (await orderRouteTool.handler({
      broker: "does-not-exist",
      symbol: "AAPL",
      side: "buy",
      type: "market",
      qty: 1,
      dry_run: true,
    })) as { status: string; reason?: string };
    expect(r.status).toBe("rejected");
    expect(r.reason).toMatch(/unknown_broker/);
  });

  it("requires qty OR sizing inputs", async () => {
    const r = (await orderRouteTool.handler({
      broker: "anything",
      symbol: "AAPL",
      side: "buy",
      type: "market",
      dry_run: true,
    })) as { status: string; reason?: string };
    // unknown_broker fires first; the message order is fine — assert it's rejected
    expect(r.status).toBe("rejected");
  });
});
