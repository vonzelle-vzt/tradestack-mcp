import { z } from "zod";
import { httpJson } from "../lib/http.js";

export const symbolSearchSchema = z.object({
  query: z.string().min(1),
  exchange: z.string().optional(),
  type: z.enum(["stock", "futures", "forex", "crypto", "index", "fund", "bond", "economic"]).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

const SEARCH_URL = "https://symbol-search.tradingview.com/symbol_search/";

interface SymbolSearchResult {
  symbol: string;
  description: string;
  type: string;
  exchange: string;
  currency_code?: string;
  provider_id?: string;
}

export async function symbolSearch(input: z.infer<typeof symbolSearchSchema>): Promise<{ matches: SymbolSearchResult[] }> {
  const params = new URLSearchParams({
    text: input.query,
    hl: "1",
    exchange: input.exchange ?? "",
    lang: "en",
    type: input.type ?? "",
    domain: "production",
  });
  const url = `${SEARCH_URL}?${params.toString()}`;
  const raw = await httpJson<SymbolSearchResult[]>(url, {
    headers: { referer: "https://www.tradingview.com/" },
    cacheKey: `symbol_search:${url}`,
    cacheTtlMs: 5 * 60_000,
  });
  return { matches: raw.slice(0, input.limit) };
}

export const symbolSearchTool = {
  name: "symbol_search",
  description:
    "Search for symbols across TradingView's universe (stocks, futures, forex, crypto, indices, funds). Returns ticker, exchange, description, and type.",
  inputSchema: symbolSearchSchema,
  handler: symbolSearch,
};
