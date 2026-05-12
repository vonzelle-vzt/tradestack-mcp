import { describe, it, expect } from "vitest";
import { riskPositionSize } from "./risk.js";

describe("riskPositionSize", () => {
  it("fixed_fractional sizes correctly", () => {
    const r = riskPositionSize({
      account_equity: 50_000,
      entry_price: 100,
      stop_price: 97,
      side: "long",
      max_risk_pct: 0.01,
      method: "fixed_fractional",
    });
    // $500 budget / $3 risk per share = 166.67 → floor 166
    expect(r.qty).toBe(166);
    expect(r.risk_per_unit).toBe(3);
    expect(r.total_risk).toBe(500);
    expect(r.method).toBe("fixed_fractional");
  });

  it("rejects long when stop is above entry", () => {
    expect(() =>
      riskPositionSize({
        account_equity: 10_000,
        entry_price: 100,
        stop_price: 105,
        side: "long",
        max_risk_pct: 0.01,
        method: "fixed_fractional",
      }),
    ).toThrow(/stop_price must be below/);
  });

  it("rejects short when stop is below entry", () => {
    expect(() =>
      riskPositionSize({
        account_equity: 10_000,
        entry_price: 100,
        stop_price: 95,
        side: "short",
        max_risk_pct: 0.01,
        method: "fixed_fractional",
      }),
    ).toThrow(/stop_price must be above/);
  });

  it("rejects zero risk distance", () => {
    expect(() =>
      riskPositionSize({
        account_equity: 10_000,
        entry_price: 100,
        stop_price: 100,
        side: "long",
        max_risk_pct: 0.01,
        method: "fixed_fractional",
      }),
    ).toThrow(/cannot be equal/);
  });

  it("half-kelly caps at 25%", () => {
    // Huge edge — should still cap at 25% of equity
    const r = riskPositionSize({
      account_equity: 100_000,
      entry_price: 50,
      stop_price: 45,
      side: "long",
      max_risk_pct: 0.01,
      method: "kelly",
      win_rate: 0.9,
      avg_win_loss_ratio: 10,
    });
    expect(r.total_risk).toBeLessThanOrEqual(25_000);
    expect(r.rationale).toMatch(/Half-Kelly/);
  });

  it("kelly requires win_rate + ratio", () => {
    expect(() =>
      riskPositionSize({
        account_equity: 10_000,
        entry_price: 100,
        stop_price: 97,
        side: "long",
        max_risk_pct: 0.01,
        method: "kelly",
      }),
    ).toThrow(/win_rate/);
  });

  it("vol_target scales by ratio", () => {
    const r = riskPositionSize({
      account_equity: 100_000,
      entry_price: 100,
      stop_price: 99,
      side: "long",
      max_risk_pct: 0.01,
      method: "vol_target",
      daily_vol: 0.02,
      target_vol: 0.01,
    });
    // 1% risk × (0.01 / 0.02) = $500
    expect(r.total_risk).toBeCloseTo(500, 2);
  });
});
