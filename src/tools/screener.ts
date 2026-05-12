import { z } from "zod";
import { httpJson } from "../lib/http.js";

const MARKETS = ["america", "crypto", "forex", "europe", "asia", "uk", "india"] as const;

export const screenerQuerySchema = z.object({
  market: z.enum(MARKETS).default("america"),
  filters: z
    .array(
      z.object({
        left: z.string(),
        operation: z.enum([
          "greater",
          "egreater",
          "less",
          "eless",
          "equal",
          "nequal",
          "in_range",
          "not_in_range",
          "crosses",
          "crosses_above",
          "crosses_below",
          "match",
          "nmatch",
          "above%",
          "below%",
          "has",
          "has_none_of",
          "empty",
          "nempty",
        ]),
        right: z.unknown(),
      }),
    )
    .default([]),
  columns: z.array(z.string()).default(["name", "close", "volume", "market_cap_basic", "RSI"]),
  sort: z.object({ field: z.string(), order: z.enum(["asc", "desc"]).default("desc") }).optional(),
  range: z.tuple([z.number().int().min(0), z.number().int().min(1).max(200)]).default([0, 50]),
});

export type ScreenerQuery = z.infer<typeof screenerQuerySchema>;

const SCANNER_URL = (market: string) => `https://scanner.tradingview.com/${market}/scan`;

export async function runScreener(input: ScreenerQuery): Promise<unknown> {
  const body = JSON.stringify({
    filter: input.filters,
    columns: input.columns,
    sort: input.sort ? { sortBy: input.sort.field, sortOrder: input.sort.order } : undefined,
    range: input.range,
  });

  return httpJson(SCANNER_URL(input.market), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cacheKey: `screener:${input.market}:${body}`,
    cacheTtlMs: 60_000,
  });
}

export const screenerQueryTool = {
  name: "screener_query",
  description:
    "Run TradingView's public scanner across a market. Supports stocks (america/europe/asia/uk/india), crypto, and forex. 180+ columns and 18 filter operations including crosses_above/crosses_below for golden/death cross detection.",
  inputSchema: screenerQuerySchema,
  handler: runScreener,
};
