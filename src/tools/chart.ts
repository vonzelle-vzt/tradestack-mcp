import { z } from "zod";

const SNAPSHOT_URL = "https://www.tradingview.com/snapshot/";

export const chartSnapshotSchema = z.object({
  symbol: z.string().min(1).describe('Exchange-prefixed symbol, e.g. "NASDAQ:AAPL" or "BINANCE:BTCUSDT"'),
  interval: z.enum(["1", "5", "15", "30", "60", "240", "D", "W", "M"]).default("D"),
  studies: z.array(z.string()).default([]).describe("Indicator names to overlay, e.g. ['RSI', 'MACD']"),
});

export interface ChartSnapshotResult {
  image_url: string;
  symbol: string;
  interval: string;
  structured: {
    studies: string[];
    note: string;
  };
}

export async function chartSnapshot(input: z.infer<typeof chartSnapshotSchema>): Promise<ChartSnapshotResult> {
  const id = encodeURIComponent(`${input.symbol}-${input.interval}-${input.studies.join(",")}`);
  const url = `${SNAPSHOT_URL}${id}.png`;

  return {
    image_url: url,
    symbol: input.symbol,
    interval: input.interval,
    structured: {
      studies: input.studies,
      note: "v0: image-only snapshot. Structured indicator values via data-feed plugin (Polygon/Alpaca/Databento) — see docs/platforms/data-feeds.md",
    },
  };
}

export const chartSnapshotTool = {
  name: "chart_snapshot",
  description:
    "Returns a TradingView chart image URL plus structured metadata. In v0 the structured payload references studies requested; full structured indicator values are delivered when a data-feed plugin is registered.",
  inputSchema: chartSnapshotSchema,
  handler: chartSnapshot,
};
