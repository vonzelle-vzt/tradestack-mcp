import { httpJson } from "../../lib/http.js";
import type { DataFeedPlugin } from "../types.js";

interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}
interface AlpacaBarsResp {
  bars?: AlpacaBar[] | Record<string, AlpacaBar[]>;
}
interface AlpacaQuoteResp {
  quote?: { bp: number; ap: number; t: string };
}

const TIMEFRAME_MAP: Record<string, string> = {
  "1m": "1Min",
  "5m": "5Min",
  "15m": "15Min",
  "30m": "30Min",
  "1h": "1Hour",
  "4h": "4Hour",
  "1d": "1Day",
  "1w": "1Week",
};

export function createAlpacaPlugin(keyId: string, secretKey: string): DataFeedPlugin {
  const headers = { "APCA-API-KEY-ID": keyId, "APCA-API-SECRET-KEY": secretKey };
  const base = "https://data.alpaca.markets/v2";

  return {
    name: "alpaca",
    kind: "datafeed",
    capabilities: ["ohlcv", "quote"],

    async ohlcv({ symbol, timeframe, from, to, limit }) {
      const tf = TIMEFRAME_MAP[timeframe];
      if (!tf) throw new Error(`unsupported timeframe: ${timeframe}`);
      const params = new URLSearchParams({
        timeframe: tf,
        limit: String(limit ?? 500),
      });
      if (from) params.set("start", from);
      if (to) params.set("end", to);
      const url = `${base}/stocks/${encodeURIComponent(symbol)}/bars?${params.toString()}`;
      const data = await httpJson<AlpacaBarsResp>(url, {
        headers,
        cacheKey: `alpaca:bars:${url}`,
        cacheTtlMs: 30_000,
        timeoutMs: 8_000,
      });
      const list = Array.isArray(data.bars) ? data.bars : (data.bars?.[symbol] ?? []);
      return { bars: list.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })) };
    },

    async quote({ symbol }) {
      const url = `${base}/stocks/${encodeURIComponent(symbol)}/quotes/latest`;
      const data = await httpJson<AlpacaQuoteResp>(url, { headers, timeoutMs: 4_000 });
      const q = data.quote;
      if (!q) throw new Error(`no quote for ${symbol}`);
      return { bid: q.bp, ask: q.ap, last: (q.bp + q.ap) / 2, ts: q.t };
    },
  };
}
