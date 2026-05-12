/**
 * Plugin contracts. External packages (or in-tree adapters) implement these
 * to extend TradeStack without touching core tools.
 *
 * Every plugin has a `name` (kebab-case) and is registered at server start.
 */

export interface BrokerOrder {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  type: "market" | "limit" | "stop" | "stop_limit";
  limit_price?: number;
  stop_price?: number;
  tif?: "day" | "gtc" | "ioc" | "fok";
  client_order_id?: string;
}

export interface BrokerPosition {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  unrealized_pnl: number;
}

export interface BrokerPlugin {
  name: string;
  kind: "broker";
  capabilities: Array<"stocks" | "futures" | "forex" | "crypto" | "options">;
  place_order(order: BrokerOrder): Promise<{ id: string; status: string }>;
  cancel_order(id: string): Promise<{ ok: boolean }>;
  positions(): Promise<BrokerPosition[]>;
  account(): Promise<{ equity: number; cash: number; buying_power: number }>;
}

export interface CodegenPlugin {
  name: string;
  kind: "codegen";
  source_languages: string[];
  target_languages: string[];
  transpile(input: { source: string; from: string; to: string }): Promise<{
    code: string;
    warnings: string[];
  }>;
  validate?(input: { code: string; language: string }): Promise<{
    ok: boolean;
    errors: Array<{ line?: number; column?: number; message: string }>;
  }>;
}

export interface ScannerPlugin {
  name: string;
  kind: "scanner";
  asset_classes: Array<"stocks" | "futures" | "forex" | "crypto" | "etf">;
  scan(input: { filters: Record<string, unknown>; limit?: number }): Promise<{
    matches: Array<{ symbol: string; data: Record<string, unknown> }>;
  }>;
}

export interface DataFeedPlugin {
  name: string;
  kind: "datafeed";
  capabilities: Array<"ohlcv" | "quote" | "trades" | "level2" | "options">;
  ohlcv?(input: { symbol: string; timeframe: string; from?: string; to?: string; limit?: number }): Promise<{
    bars: Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>;
  }>;
  quote?(input: { symbol: string }): Promise<{ bid: number; ask: number; last: number; ts: string }>;
}

export type Plugin = BrokerPlugin | CodegenPlugin | ScannerPlugin | DataFeedPlugin;
