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

export interface CompositeAlertCondition {
  field: string;            // e.g. "rsi", "close", "volume"
  op: "lt" | "lte" | "gt" | "gte" | "eq" | "between";
  value: number | [number, number];
}

export interface CompositeAlert {
  id: string;
  user_id: string;
  name: string;
  symbol: string;
  conditions: CompositeAlertCondition[];
  logic: "all" | "any";
  status: "active" | "paused" | "fired" | "expired";
  expires_at: string | null;
  created_at: string;
}

export interface CompositeAlertInput {
  name: string;
  symbol: string;
  conditions: CompositeAlertCondition[];
  logic: "all" | "any";
  expires_at?: string | null;
}

export interface StrategyRun {
  id: string;
  user_id: string;
  strategy_name: string;
  stage: "replay" | "paper" | "live";
  pine_source: string | null;
  config: Record<string, unknown>;
  metrics: StrategyMetrics | null;
  started_at: string;
  ended_at: string | null;
  promoted: boolean;
}

export interface StrategyMetrics {
  sharpe?: number;
  calmar?: number;
  max_dd?: number;
  profit_factor?: number;
  win_rate?: number;
  n_trades?: number;
  net_pnl?: number;
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

  compositeUpsert(userId: string, input: CompositeAlertInput): Promise<CompositeAlert>;
  compositeList(userId: string): Promise<CompositeAlert[]>;
  compositeDelete(userId: string, name: string): Promise<boolean>;

  strategyRunInsert(userId: string, run: Omit<StrategyRun, "id" | "user_id" | "started_at" | "ended_at" | "promoted">): Promise<StrategyRun>;
  strategyRunComplete(userId: string, id: string, metrics: StrategyMetrics): Promise<StrategyRun>;
  strategyRunsByName(userId: string, name: string): Promise<StrategyRun[]>;
}
