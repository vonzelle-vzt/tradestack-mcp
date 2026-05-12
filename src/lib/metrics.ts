export interface Trade {
  pnl: number;
}

export function sharpe(returns: number[], rf = 0): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length - rf;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(252);
}

export function maxDrawdown(equityCurve: number[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const e of equityCurve) {
    if (e > peak) peak = e;
    if (peak > 0) {
      const dd = (peak - e) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

export function profitFactor(trades: Trade[]): number {
  let gross = 0;
  let loss = 0;
  for (const t of trades) {
    if (t.pnl > 0) gross += t.pnl;
    else loss += -t.pnl;
  }
  if (loss === 0) return gross > 0 ? Infinity : 0;
  return gross / loss;
}

export function winRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.pnl > 0).length;
  return wins / trades.length;
}

export function calmar(annualReturn: number, mdd: number): number {
  if (mdd === 0) return annualReturn > 0 ? Infinity : 0;
  return annualReturn / mdd;
}
