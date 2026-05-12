import { z } from "zod";

export const riskPositionSizeSchema = z.object({
  account_equity: z.number().positive(),
  entry_price: z.number().positive(),
  stop_price: z.number().positive(),
  side: z.enum(["long", "short"]).default("long"),
  max_risk_pct: z.number().min(0.001).max(0.1).default(0.01).describe("Fraction of equity to risk, 0.01 = 1%"),
  method: z.enum(["fixed_fractional", "kelly", "vol_target"]).default("fixed_fractional"),
  win_rate: z.number().min(0).max(1).optional().describe("Required if method = kelly"),
  avg_win_loss_ratio: z.number().positive().optional().describe("Required if method = kelly"),
  daily_vol: z.number().positive().optional().describe("Required if method = vol_target"),
  target_vol: z.number().positive().optional().describe("Required if method = vol_target"),
});

export interface PositionSizeResult {
  qty: number;
  risk_per_unit: number;
  total_risk: number;
  method: string;
  rationale: string;
}

export function riskPositionSize(input: z.infer<typeof riskPositionSizeSchema>): PositionSizeResult {
  const { account_equity, entry_price, stop_price, side, max_risk_pct, method } = input;

  const riskPerUnit = Math.abs(entry_price - stop_price);
  if (riskPerUnit === 0) {
    throw new Error("entry_price and stop_price cannot be equal");
  }
  if (side === "long" && stop_price >= entry_price) {
    throw new Error("long: stop_price must be below entry_price");
  }
  if (side === "short" && stop_price <= entry_price) {
    throw new Error("short: stop_price must be above entry_price");
  }

  let totalRisk = account_equity * max_risk_pct;
  let rationale = `Fixed-fractional: ${(max_risk_pct * 100).toFixed(2)}% of equity = $${totalRisk.toFixed(2)}`;

  if (method === "kelly") {
    if (input.win_rate === undefined || input.avg_win_loss_ratio === undefined) {
      throw new Error("kelly requires win_rate and avg_win_loss_ratio");
    }
    const f = input.win_rate - (1 - input.win_rate) / input.avg_win_loss_ratio;
    const fractional = Math.max(0, Math.min(0.25, f * 0.5)); // half-Kelly, capped 25%
    totalRisk = account_equity * fractional;
    rationale = `Half-Kelly (capped 25%): edge=${f.toFixed(3)}, fraction=${fractional.toFixed(3)} → $${totalRisk.toFixed(2)}`;
  }

  if (method === "vol_target") {
    if (input.daily_vol === undefined || input.target_vol === undefined) {
      throw new Error("vol_target requires daily_vol and target_vol");
    }
    const scale = input.target_vol / input.daily_vol;
    totalRisk = account_equity * max_risk_pct * scale;
    rationale = `Vol-target: scale=${scale.toFixed(3)} (target ${input.target_vol} / actual ${input.daily_vol}) → $${totalRisk.toFixed(2)}`;
  }

  const qty = Math.floor(totalRisk / riskPerUnit);

  return {
    qty,
    risk_per_unit: riskPerUnit,
    total_risk: totalRisk,
    method,
    rationale,
  };
}

export const riskPositionSizeTool = {
  name: "risk_position_size",
  description:
    "Compute position size by fixed-fractional, half-Kelly (capped 25%), or vol-target methods. Pure local math, no broker calls. Validates stop direction.",
  inputSchema: riskPositionSizeSchema,
  handler: async (i: z.infer<typeof riskPositionSizeSchema>) => Promise.resolve(riskPositionSize(i)),
};
