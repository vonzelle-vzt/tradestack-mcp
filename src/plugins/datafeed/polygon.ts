import { httpJson } from "../../lib/http.js";
import type { DataFeedPlugin } from "../types.js";

interface PolygonAggBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}
interface PolygonAggResp {
  results?: PolygonAggBar[];
  resultsCount?: number;
}
interface PolygonNbboResp {
  results?: { P?: number; S?: number; X?: number; p?: number; s?: number; x?: number; t?: number };
}

const TIMEFRAME_MAP: Record<string, { mult: number; span: string }> = {
  "1m": { mult: 1, span: "minute" },
  "5m": { mult: 5, span: "minute" },
  "15m": { mult: 15, span: "minute" },
  "30m": { mult: 30, span: "minute" },
  "1h": { mult: 1, span: "hour" },
  "4h": { mult: 4, span: "hour" },
  "1d": { mult: 1, span: "day" },
  "1w": { mult: 1, span: "week" },
};

export function createPolygonPlugin(apiKey: string): DataFeedPlugin {
  return {
    name: "polygon",
    kind: "datafeed",
    capabilities: ["ohlcv", "quote"],

    async ohlcv({ symbol, timeframe, from, to, limit }) {
      const tf = TIMEFRAME_MAP[timeframe];
      if (!tf) throw new Error(`unsupported timeframe: ${timeframe}`);
      const fromDate = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const toDate = to ?? new Date().toISOString().slice(0, 10);
      const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${tf.mult}/${tf.span}/${fromDate}/${toDate}?limit=${limit ?? 500}&apiKey=${apiKey}`;
      const data = await httpJson<PolygonAggResp>(url, {
        cacheKey: `polygon:agg:${url}`,
        cacheTtlMs: 30_000,
        timeoutMs: 8_000,
      });
      const bars = (data.results ?? []).map((b) => ({
        t: new Date(b.t).toISOString(),
        o: b.o,
        h: b.h,
        l: b.l,
        c: b.c,
        v: b.v,
      }));
      return { bars };
    },

    async quote({ symbol }) {
      const url = `https://api.polygon.io/v2/last/nbbo/${encodeURIComponent(symbol)}?apiKey=${apiKey}`;
      const data = await httpJson<PolygonNbboResp>(url, { timeoutMs: 4_000 });
      const r = data.results ?? {};
      const bid = r.p ?? 0;
      const ask = r.P ?? 0;
      return {
        bid,
        ask,
        last: (bid + ask) / 2,
        ts: r.t ? new Date(r.t / 1_000_000).toISOString() : new Date().toISOString(),
      };
    },
  };
}
