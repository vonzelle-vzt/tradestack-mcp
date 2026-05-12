export interface Watchlist {
  name: string;
  symbols: string[];
  note?: string;
  updated_at: string;
}

export interface WatchlistSummary {
  name: string;
  size: number;
  updated_at: string;
}

export interface AlertEvent {
  id: string;
  user_id: string;
  source: string;
  symbol: string | null;
  payload: Record<string, unknown>;
  received_at: string;
  acted_on: boolean;
  outcome: "win" | "loss" | "expired" | null;
}

export interface AlertEventInput {
  source: string;
  symbol: string | null;
  payload: Record<string, unknown>;
}

export interface StateBackend {
  readonly kind: "memory" | "supabase";
  watchlistGet(userId: string, name: string): Promise<Watchlist | null>;
  watchlistUpsert(userId: string, wl: Watchlist): Promise<Watchlist>;
  watchlistAdd(userId: string, name: string, symbol: string): Promise<Watchlist>;
  watchlistRemove(userId: string, name: string, symbol: string): Promise<Watchlist>;
  watchlistList(userId: string): Promise<WatchlistSummary[]>;

  webhookTokenGet(userId: string): Promise<string | null>;
  webhookTokenRotate(userId: string): Promise<string>;
  userIdByWebhookToken(token: string): Promise<string | null>;

  alertInsert(userId: string, evt: AlertEventInput): Promise<AlertEvent>;
  alertsRecent(userId: string, limit: number): Promise<AlertEvent[]>;
}
