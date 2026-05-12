import { describe, it, expect } from "vitest";
import { portfolioVarTool, correlationMatrixTool } from "./portfolio.js";

describe("risk_portfolio_var", () => {
  it("single-position VaR equals notional * vol * z", async () => {
    const r = (await portfolioVarTool.handler({
      positions: [{ symbol: "X", qty: 100, price: 50, daily_vol: 0.02 }],
      confidence: 0.95,
      horizon_days: 1,
      correlation: 0.5,
    })) as { var_amount: number; z_score: number };
    // notional = 5000, daily_vol = 0.02, z(0.95) ≈ 1.6449
    expect(r.var_amount).toBeCloseTo(5000 * 0.02 * r.z_score, 2);
  });

  it("VaR scales with sqrt(horizon)", async () => {
    const one = (await portfolioVarTool.handler({
      positions: [{ symbol: "X", qty: 100, price: 50, daily_vol: 0.02 }],
      confidence: 0.95,
      horizon_days: 1,
      correlation: 0,
    })) as { var_amount: number };
    const four = (await portfolioVarTool.handler({
      positions: [{ symbol: "X", qty: 100, price: 50, daily_vol: 0.02 }],
      confidence: 0.95,
      horizon_days: 4,
      correlation: 0,
    })) as { var_amount: number };
    expect(four.var_amount).toBeCloseTo(one.var_amount * 2, 2);
  });

  it("diversification reduces VaR vs single position at ρ=0", async () => {
    const single = (await portfolioVarTool.handler({
      positions: [{ symbol: "X", qty: 100, price: 50, daily_vol: 0.02 }],
      confidence: 0.95,
      horizon_days: 1,
      correlation: 0,
    })) as { var_amount: number };
    const diversified = (await portfolioVarTool.handler({
      positions: [
        { symbol: "X", qty: 50, price: 50, daily_vol: 0.02 },
        { symbol: "Y", qty: 50, price: 50, daily_vol: 0.02 },
      ],
      confidence: 0.95,
      horizon_days: 1,
      correlation: 0,
    })) as { var_amount: number };
    expect(diversified.var_amount).toBeLessThan(single.var_amount);
  });
});

describe("risk_correlation_matrix", () => {
  it("identical series → correlation 1", async () => {
    const r = (await correlationMatrixTool.handler({
      returns: {
        A: [0.01, -0.02, 0.03, 0.005],
        B: [0.01, -0.02, 0.03, 0.005],
      },
    })) as { matrix: Record<string, Record<string, number>> };
    expect(r.matrix.A!.B!).toBeCloseTo(1, 5);
  });

  it("inverse series → correlation -1", async () => {
    const r = (await correlationMatrixTool.handler({
      returns: {
        A: [1, 2, 3, 4],
        B: [-1, -2, -3, -4],
      },
    })) as { matrix: Record<string, Record<string, number>> };
    expect(r.matrix.A!.B!).toBeCloseTo(-1, 5);
  });
});
