import { z } from "zod";

export const portfolioVarSchema = z.object({
  positions: z.array(
    z.object({
      symbol: z.string().min(1),
      qty: z.number(),
      price: z.number().positive(),
      daily_vol: z.number().min(0).describe("Daily return volatility (e.g. 0.02 = 2%)"),
    }),
  ),
  confidence: z.number().min(0.5).max(0.999).default(0.95),
  horizon_days: z.number().int().min(1).max(252).default(1),
  correlation: z.number().min(-1).max(1).default(0.5).describe("Uniform pairwise correlation assumption"),
});

interface VarResult {
  var_amount: number;
  total_notional: number;
  per_position: Array<{ symbol: string; notional: number; vol: number; standalone_var: number }>;
  confidence: number;
  horizon_days: number;
  z_score: number;
  rationale: string;
}

function zScore(p: number): number {
  // Acklam approximation for the inverse normal CDF (good to ~7 dec)
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
}

export const portfolioVarTool = {
  name: "risk_portfolio_var",
  description:
    "Compute parametric Value-at-Risk for a portfolio. Uses standalone volatilities + a uniform pairwise correlation assumption (default 0.5). Returns dollar VaR at the chosen confidence and horizon.",
  inputSchema: portfolioVarSchema,
  handler: async (input: z.infer<typeof portfolioVarSchema>): Promise<VarResult> => {
    const z = zScore(input.confidence);
    const horizonScale = Math.sqrt(input.horizon_days);
    const perPosition = input.positions.map((p) => {
      const notional = Math.abs(p.qty) * p.price;
      const standaloneVar = notional * p.daily_vol * z * horizonScale;
      return { symbol: p.symbol, notional, vol: p.daily_vol, standalone_var: standaloneVar };
    });
    const totalNotional = perPosition.reduce((a, p) => a + p.notional, 0);

    // Portfolio variance with uniform correlation ρ:
    //   σ_p² = Σ wᵢ² σᵢ² + 2 ρ Σᵢ<ⱼ wᵢ wⱼ σᵢ σⱼ
    const rho = input.correlation;
    let variance = 0;
    for (let i = 0; i < input.positions.length; i++) {
      const wi = perPosition[i]!.notional / (totalNotional || 1);
      const si = input.positions[i]!.daily_vol;
      variance += (wi * si) ** 2;
      for (let j = i + 1; j < input.positions.length; j++) {
        const wj = perPosition[j]!.notional / (totalNotional || 1);
        const sj = input.positions[j]!.daily_vol;
        variance += 2 * rho * wi * wj * si * sj;
      }
    }
    const portfolioVol = Math.sqrt(Math.max(0, variance));
    const varAmount = totalNotional * portfolioVol * z * horizonScale;

    return {
      var_amount: varAmount,
      total_notional: totalNotional,
      per_position: perPosition,
      confidence: input.confidence,
      horizon_days: input.horizon_days,
      z_score: z,
      rationale: `Parametric VaR @ ${(input.confidence * 100).toFixed(1)}% over ${input.horizon_days}d with ρ=${rho}. Portfolio σ=${portfolioVol.toFixed(4)}.`,
    };
  },
};

export const correlationMatrixSchema = z.object({
  returns: z.record(z.array(z.number())).describe("Map of symbol → return series. All series should be the same length."),
});

export const correlationMatrixTool = {
  name: "risk_correlation_matrix",
  description: "Compute Pearson correlation matrix from a map of symbol → return series.",
  inputSchema: correlationMatrixSchema,
  handler: async ({ returns }: z.infer<typeof correlationMatrixSchema>) => {
    const symbols = Object.keys(returns);
    const matrix: Record<string, Record<string, number>> = {};
    for (const a of symbols) {
      matrix[a] = {};
      for (const b of symbols) {
        matrix[a]![b] = corr(returns[a]!, returns[b]!);
      }
    }
    return { symbols, matrix };
  },
};

function corr(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i]!;
    sb += b[i]!;
  }
  const ma = sa / n;
  const mb = sb / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i]! - ma;
    const xb = b[i]! - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? 0 : num / denom;
}
