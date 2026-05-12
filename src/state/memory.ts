import { randomBytes } from "node:crypto";
import type { StateBackend, Watchlist, WatchlistSummary } from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function createMemoryBackend(): StateBackend {
  const watchlists = new Map<string, Map<string, Watchlist>>();
  const tokens = new Map<string, string>();

  const userBucket = (userId: string): Map<string, Watchlist> => {
    let b = watchlists.get(userId);
    if (!b) {
      b = new Map();
      watchlists.set(userId, b);
    }
    return b;
  };

  return {
    kind: "memory",

    async watchlistGet(userId, name) {
      return userBucket(userId).get(name) ?? null;
    },

    async watchlistUpsert(userId, wl) {
      const next: Watchlist = { ...wl, updated_at: nowIso() };
      userBucket(userId).set(wl.name, next);
      return next;
    },

    async watchlistAdd(userId, name, symbol) {
      const bucket = userBucket(userId);
      const wl = bucket.get(name) ?? { name, symbols: [], updated_at: nowIso() };
      if (!wl.symbols.includes(symbol)) wl.symbols.push(symbol);
      wl.updated_at = nowIso();
      bucket.set(name, wl);
      return wl;
    },

    async watchlistRemove(userId, name, symbol) {
      const bucket = userBucket(userId);
      const wl = bucket.get(name);
      if (!wl) return { name, symbols: [], updated_at: nowIso() };
      wl.symbols = wl.symbols.filter((s) => s !== symbol);
      wl.updated_at = nowIso();
      return wl;
    },

    async watchlistList(userId): Promise<WatchlistSummary[]> {
      const bucket = userBucket(userId);
      return Array.from(bucket.values()).map((w) => ({
        name: w.name,
        size: w.symbols.length,
        updated_at: w.updated_at,
      }));
    },

    async webhookTokenGet(userId) {
      return tokens.get(userId) ?? null;
    },

    async webhookTokenRotate(userId) {
      const token = randomBytes(24).toString("base64url");
      tokens.set(userId, token);
      return token;
    },
  };
}
