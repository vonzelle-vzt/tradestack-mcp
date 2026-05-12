import { z } from "zod";
import { listPlugins } from "../plugins/registry.js";
import type { DataFeedPlugin } from "../plugins/types.js";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"] as const;

export const symbolOhlcvSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.enum(TIMEFRAMES).default("1d"),
  from: z.string().optional().describe("ISO date YYYY-MM-DD (inclusive)"),
  to: z.string().optional().describe("ISO date YYYY-MM-DD (inclusive)"),
  limit: z.number().int().min(1).max(5000).default(500),
  feed: z.string().optional().describe("Data feed plugin name (polygon, alpaca, ...). Defaults to the first registered datafeed with ohlcv capability."),
});

export const symbolOhlcvTool = {
  name: "symbol_ohlcv",
  description:
    "Return OHLCV bars for a symbol via a registered data-feed plugin. Set POLYGON_API_KEY or ALPACA_KEY_ID/ALPACA_SECRET_KEY to enable the in-tree feeds; or register your own DataFeedPlugin.",
  inputSchema: symbolOhlcvSchema,
  handler: async (input: z.infer<typeof symbolOhlcvSchema>) => {
    const feeds = listPlugins("datafeed") as DataFeedPlugin[];
    const supportsOhlcv = feeds.filter((f) => f.capabilities.includes("ohlcv") && typeof f.ohlcv === "function");
    const chosen = input.feed
      ? supportsOhlcv.find((f) => f.name === input.feed)
      : supportsOhlcv[0];
    if (!chosen) {
      return {
        error: "no_datafeed",
        message:
          "No data-feed plugin is registered. Set POLYGON_API_KEY or ALPACA_KEY_ID+ALPACA_SECRET_KEY, or register a custom DataFeedPlugin.",
        registered: feeds.map((f) => f.name),
      };
    }
    const result = await chosen.ohlcv!({
      symbol: input.symbol,
      timeframe: input.timeframe,
      from: input.from,
      to: input.to,
      limit: input.limit,
    });
    return { feed: chosen.name, ...result };
  },
};

export const symbolQuoteSchema = z.object({
  symbol: z.string().min(1),
  feed: z.string().optional(),
});

export const symbolQuoteTool = {
  name: "symbol_quote",
  description: "Return the latest bid/ask/last quote for a symbol via a registered data-feed plugin.",
  inputSchema: symbolQuoteSchema,
  handler: async (input: z.infer<typeof symbolQuoteSchema>) => {
    const feeds = listPlugins("datafeed") as DataFeedPlugin[];
    const supportsQuote = feeds.filter((f) => f.capabilities.includes("quote") && typeof f.quote === "function");
    const chosen = input.feed
      ? supportsQuote.find((f) => f.name === input.feed)
      : supportsQuote[0];
    if (!chosen) {
      return { error: "no_datafeed", message: "No data-feed plugin registered with quote capability." };
    }
    const q = await chosen.quote!({ symbol: input.symbol });
    return { feed: chosen.name, ...q };
  },
};
