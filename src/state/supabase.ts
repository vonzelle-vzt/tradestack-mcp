import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  StateBackend,
  Watchlist,
  WatchlistSummary,
  AlertEvent,
  AlertEventInput,
} from "./types.js";
import { log } from "../lib/logger.js";

interface WatchlistRow {
  user_id: string;
  name: string;
  symbols: string[];
  note: string | null;
  updated_at: string;
}

interface UserSettingsRow {
  user_id: string;
  webhook_token: string | null;
}

interface AlertRow {
  id: string;
  user_id: string;
  source: string;
  symbol: string | null;
  payload: Record<string, unknown>;
  received_at: string;
  acted_on: boolean;
  outcome: "win" | "loss" | "expired" | null;
}

export function createSupabaseBackend(url: string, serviceRoleKey: string): StateBackend {
  const client: SupabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const toWatchlist = (row: WatchlistRow): Watchlist => ({
    name: row.name,
    symbols: row.symbols,
    note: row.note ?? undefined,
    updated_at: row.updated_at,
  });

  return {
    kind: "supabase",

    async watchlistGet(userId, name) {
      const { data, error } = await client
        .from("watchlists")
        .select("user_id,name,symbols,note,updated_at")
        .eq("user_id", userId)
        .eq("name", name)
        .maybeSingle<WatchlistRow>();
      if (error) {
        log.error("supabase watchlistGet failed", { error: error.message });
        throw error;
      }
      return data ? toWatchlist(data) : null;
    },

    async watchlistUpsert(userId, wl) {
      const { data, error } = await client
        .from("watchlists")
        .upsert(
          {
            user_id: userId,
            name: wl.name,
            symbols: wl.symbols,
            note: wl.note ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,name" },
        )
        .select("user_id,name,symbols,note,updated_at")
        .single<WatchlistRow>();
      if (error || !data) throw error ?? new Error("watchlistUpsert returned no row");
      return toWatchlist(data);
    },

    async watchlistAdd(userId, name, symbol) {
      const existing = await this.watchlistGet(userId, name);
      const symbols = existing?.symbols ?? [];
      if (!symbols.includes(symbol)) symbols.push(symbol);
      return this.watchlistUpsert(userId, {
        name,
        symbols,
        note: existing?.note,
        updated_at: new Date().toISOString(),
      });
    },

    async watchlistRemove(userId, name, symbol) {
      const existing = await this.watchlistGet(userId, name);
      if (!existing) return { name, symbols: [], updated_at: new Date().toISOString() };
      const symbols = existing.symbols.filter((s) => s !== symbol);
      return this.watchlistUpsert(userId, {
        name,
        symbols,
        note: existing.note,
        updated_at: new Date().toISOString(),
      });
    },

    async watchlistList(userId): Promise<WatchlistSummary[]> {
      const { data, error } = await client
        .from("watchlists")
        .select("name,symbols,updated_at")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        name: r.name as string,
        size: (r.symbols as string[]).length,
        updated_at: r.updated_at as string,
      }));
    },

    async webhookTokenGet(userId) {
      const { data, error } = await client
        .from("user_settings")
        .select("webhook_token")
        .eq("user_id", userId)
        .maybeSingle<UserSettingsRow>();
      if (error) throw error;
      return data?.webhook_token ?? null;
    },

    async webhookTokenRotate(userId) {
      const token = randomBytes(24).toString("base64url");
      const { error } = await client.from("user_settings").upsert(
        {
          user_id: userId,
          webhook_token: token,
          webhook_rotated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      return token;
    },

    async userIdByWebhookToken(token) {
      const { data, error } = await client
        .from("user_settings")
        .select("user_id")
        .eq("webhook_token", token)
        .maybeSingle<UserSettingsRow>();
      if (error) throw error;
      return data?.user_id ?? null;
    },

    async alertInsert(userId, evt: AlertEventInput): Promise<AlertEvent> {
      const { data, error } = await client
        .from("alert_events")
        .insert({
          user_id: userId,
          source: evt.source,
          symbol: evt.symbol,
          payload: evt.payload,
        })
        .select("*")
        .single<AlertRow>();
      if (error || !data) throw error ?? new Error("alertInsert returned no row");
      return data;
    },

    async alertsRecent(userId, limit) {
      const { data, error } = await client
        .from("alert_events")
        .select("*")
        .eq("user_id", userId)
        .order("received_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AlertEvent[];
    },
  };
}
