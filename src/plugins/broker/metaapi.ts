import { httpJson } from "../../lib/http.js";
import type { BrokerOrder, BrokerPlugin, BrokerPosition } from "../types.js";

/**
 * MetaApi (MT5/MT4 cloud) REST adapter. Status: alpha — untested
 * against a live MetaApi account. Reference:
 *   https://metaapi.cloud/docs/client/restApi/
 */

interface MetaApiTradeResp {
  orderId?: string;
  positionId?: string;
  numericCode?: number;
  stringCode?: string;
  message?: string;
}

interface MetaApiPosition {
  id: string;
  symbol: string;
  type: "POSITION_TYPE_BUY" | "POSITION_TYPE_SELL";
  volume: number;
  openPrice: number;
  unrealizedProfit: number;
}

interface MetaApiAccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
}

const MT5_ACTIONS: Record<string, string> = {
  market: "ORDER_TYPE_BUY",  // overridden per side below
  limit: "ORDER_TYPE_BUY_LIMIT",
  stop: "ORDER_TYPE_BUY_STOP",
  stop_limit: "ORDER_TYPE_BUY_STOP_LIMIT",
};

function mt5Type(o: BrokerOrder): string {
  if (o.type === "market") return o.side === "buy" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL";
  const base = MT5_ACTIONS[o.type] ?? "ORDER_TYPE_BUY";
  return o.side === "sell" ? base.replace("BUY", "SELL") : base;
}

export function createMetaApiBroker(token: string, accountId: string): BrokerPlugin {
  const base = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${accountId}`;
  const headers = { "auth-token": token, "content-type": "application/json" };

  return {
    name: "metaapi",
    kind: "broker",
    capabilities: ["forex", "futures", "crypto", "stocks"],

    async place_order(o: BrokerOrder) {
      const body: Record<string, unknown> = {
        actionType: mt5Type(o),
        symbol: o.symbol,
        volume: o.qty,
        magic: 0x7AC5,
        clientId: o.client_order_id,
      };
      if (o.limit_price) body.openPrice = o.limit_price;
      if (o.stop_price) body.stopLoss = o.stop_price;
      const res = await httpJson<MetaApiTradeResp>(`${base}/trade`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        timeoutMs: 8_000,
      });
      if (res.numericCode && res.numericCode !== 0 && res.numericCode !== 10009) {
        throw new Error(`metaapi trade failed: ${res.stringCode} (${res.message})`);
      }
      return { id: res.orderId ?? res.positionId ?? "unknown", status: res.stringCode ?? "submitted" };
    },

    async cancel_order(id: string) {
      const res = await httpJson<MetaApiTradeResp>(`${base}/trade`, {
        method: "POST",
        headers,
        body: JSON.stringify({ actionType: "ORDER_CANCEL", orderId: id }),
        timeoutMs: 4_000,
      });
      return { ok: !res.numericCode || res.numericCode === 0 };
    },

    async positions(): Promise<BrokerPosition[]> {
      const raw = await httpJson<MetaApiPosition[]>(`${base}/positions`, { headers, timeoutMs: 4_000 });
      return raw.map((p) => ({
        symbol: p.symbol,
        qty: p.type === "POSITION_TYPE_BUY" ? p.volume : -p.volume,
        avg_entry_price: p.openPrice,
        unrealized_pnl: p.unrealizedProfit,
      }));
    },

    async account() {
      const a = await httpJson<MetaApiAccountInfo>(`${base}/account-information`, { headers, timeoutMs: 4_000 });
      return { equity: a.equity, cash: a.balance, buying_power: a.freeMargin };
    },
  };
}
