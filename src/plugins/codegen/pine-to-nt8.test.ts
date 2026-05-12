import { describe, it, expect } from "vitest";
import { createPineToNt8Plugin } from "./pine-to-nt8.js";

const plugin = createPineToNt8Plugin();

describe("pine-to-nt8 codegen", () => {
  it("emits an NT8 Indicator class for an indicator() source", async () => {
    const src = `//@version=6
indicator("X")
plot(ta.rsi(close, 14))`;
    const r = await plugin.transpile({ source: src, from: "pinescript", to: "ninjascript" });
    expect(r.code).toMatch(/class TradeStackStrategy : Indicator/);
    expect(r.code).toMatch(/protected override void OnBarUpdate/);
  });

  it("emits an NT8 Strategy class for a strategy() source", async () => {
    const src = `//@version=6
strategy("X")
if ta.crossover(close, ta.sma(close, 20))
    strategy.entry("long", strategy.long)`;
    const r = await plugin.transpile({ source: src, from: "pinescript", to: "ninjascript" });
    expect(r.code).toMatch(/class TradeStackStrategy : Strategy/);
  });

  it("rejects wrong language pair", async () => {
    await expect(
      plugin.transpile({ source: "noop", from: "mql5", to: "ninjascript" }),
    ).rejects.toThrow(/pine-to-nt8 only/);
  });

  it("validate flags hallucinated NT8 props", async () => {
    const bad = `class Foo : Strategy { public bool ExitOnSessionClose { get; set; } }`;
    const r = await plugin.validate!({ code: bad, language: "ninjascript" });
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.message).toMatch(/ExitOnSessionClose/);
  });

  it("validate returns ok on clean code", async () => {
    const r = await plugin.validate!({ code: "class Foo : Strategy { }", language: "ninjascript" });
    expect(r.ok).toBe(true);
  });
});
