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

export interface StateBackend {
  readonly kind: "memory" | "supabase";
  watchlistGet(userId: string, name: string): Promise<Watchlist | null>;
  watchlistUpsert(userId: string, wl: Watchlist): Promise<Watchlist>;
  watchlistAdd(userId: string, name: string, symbol: string): Promise<Watchlist>;
  watchlistRemove(userId: string, name: string, symbol: string): Promise<Watchlist>;
  watchlistList(userId: string): Promise<WatchlistSummary[]>;

  /**
   * Per-user webhook token (rotates the shared secret used to verify
   * inbound TradingView alerts). Stored as plaintext for now; v0.3 hashes
   * with the global WEBHOOK_SHARED_SECRET pepper.
   */
  webhookTokenGet(userId: string): Promise<string | null>;
  webhookTokenRotate(userId: string): Promise<string>;
}
