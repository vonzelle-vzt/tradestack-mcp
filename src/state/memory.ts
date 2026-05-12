import { randomBytes, randomUUID } from "node:crypto";
import type {
  StateBackend,
  Watchlist,
  WatchlistSummary,
  AlertEvent,
  AlertEventInput,
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function createMemoryBackend(): StateBackend {
  const watchlists = new Map<string, Map<string, Watchlist>>();
  const tokens = new Map<string, string>();
  const tokenIndex = new Map<string, string>(); // token → userId
  const alertsByUser = new Map<string, AlertEvent[]>();

  const userBucket = (userId: string): Map<string, Watchlist> => {
    let b = watchlists.get(userId);
    if (!b) {
      b = new Map();
      watchlists.set(userId, b);
    }
    return b;
  };

  const alertBucket = (userId: string): AlertEvent[] => {
    let b = alertsByUser.get(userId);
    if (!b) {
      b = [];
      alertsByUser.set(userId, b);
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
      const prev = tokens.get(userId);
      if (prev) tokenIndex.delete(prev);
      const token = randomBytes(24).toString("base64url");
      tokens.set(userId, token);
      tokenIndex.set(token, userId);
      return token;
    },

    async userIdByWebhookToken(token) {
      return tokenIndex.get(token) ?? null;
    },

    async alertInsert(userId, evt: AlertEventInput): Promise<AlertEvent> {
      const full: AlertEvent = {
        id: randomUUID(),
        user_id: userId,
        source: evt.source,
        symbol: evt.symbol,
        payload: evt.payload,
        received_at: nowIso(),
        acted_on: false,
        outcome: null,
      };
      alertBucket(userId).unshift(full);
      // cap memory backend at 1000 events per user
      const bucket = alertBucket(userId);
      if (bucket.length > 1000) bucket.length = 1000;
      return full;
    },

    async alertsRecent(userId, limit) {
      return alertBucket(userId).slice(0, limit);
    },
  };
}
