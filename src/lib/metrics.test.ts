import { describe, it, expect } from "vitest";
import { sharpe, maxDrawdown, profitFactor, winRate, calmar } from "./metrics.js";

describe("metrics", () => {
  it("sharpe is 0 for a single point", () => {
    expect(sharpe([0.01])).toBe(0);
  });

  it("sharpe scales with mean/std", () => {
    const s = sharpe([0.01, 0.012, 0.008, 0.011, 0.009]);
    expect(s).toBeGreaterThan(0);
  });

  it("maxDrawdown finds the deepest peak-to-trough", () => {
    // peak at 110, trough at 80 → dd = 30/110 ≈ 0.2727
    expect(maxDrawdown([100, 110, 95, 80, 90])).toBeCloseTo(0.2727, 3);
  });

  it("profitFactor = gross win / gross loss", () => {
    expect(profitFactor([{ pnl: 100 }, { pnl: -50 }, { pnl: 75 }])).toBeCloseTo(175 / 50, 5);
  });

  it("profitFactor returns Infinity if no losses but wins exist", () => {
    expect(profitFactor([{ pnl: 100 }, { pnl: 50 }])).toBe(Infinity);
  });

  it("winRate counts strict positives", () => {
    expect(winRate([{ pnl: 1 }, { pnl: -1 }, { pnl: 0 }, { pnl: 5 }])).toBeCloseTo(0.5, 5);
  });

  it("calmar = annual return / mdd", () => {
    expect(calmar(0.3, 0.1)).toBeCloseTo(3, 5);
    expect(calmar(0.1, 0)).toBe(Infinity);
  });
});
