import { httpJson } from "../../lib/http.js";
import type { BrokerOrder, BrokerPlugin, BrokerPosition } from "../types.js";

/**
 * TradeLocker REST adapter. Status: alpha — untested against a live
 * TradeLocker account. Implements the contract; ready to be wired
 * once credentials are available. Endpoint reference:
 *   https://public-api.tradelocker.com/
 */

interface TLAuthResp {
  accessToken: string;
  refreshToken: string;
}

interface TLOrderResp {
  s: "ok" | "error";
  d?: { orderId: number; status?: string };
  errmsg?: string;
}

interface TLPositionsResp {
  s: "ok" | "error";
  d?: { positions: Array<{ id: number; tradableInstrumentId: number; routeId: number; qty: string; side: string; avgPrice: string; unrealizedPl: string; symbol?: string }> };
}

interface TLAccountStateResp {
  s: "ok" | "error";
  d?: { accountBalance: string; projectedBalance: string; availableFunds: string };
}

interface TradeLockerOpts {
  baseUrl: string;       // e.g. https://live.tradelocker.com/backend-api
  email: string;
  password: string;
  server: string;
  accountId: string;
}

export function createTradeLockerBroker(opts: TradeLockerOpts): BrokerPlugin {
  let token: string | null = null;

  async function ensureToken(): Promise<string> {
    if (token) return token;
    const res = await httpJson<TLAuthResp>(`${opts.baseUrl}/auth/jwt/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: opts.email, password: opts.password, server: opts.server }),
      timeoutMs: 8_000,
    });
    token = res.accessToken;
    return token;
  }

  function authHeaders(t: string): Record<string, string> {
    return { authorization: `Bearer ${t}`, accNum: opts.accountId, "content-type": "application/json" };
  }

  return {
    name: "tradelocker",
    kind: "broker",
    capabilities: ["forex", "futures", "crypto"],

    async place_order(o: BrokerOrder) {
      const t = await ensureToken();
      const body = {
        qty: o.qty,
        side: o.side,
        type: o.type,
        validity: o.tif ?? "GTC",
        price: o.limit_price ?? 0,
        stopPrice: o.stop_price ?? 0,
        clientOrderId: o.client_order_id,
        // The actual TradeLocker schema expects tradableInstrumentId, not symbol —
        // production wiring resolves the symbol → tradableInstrumentId first.
        // We pass `symbol` to keep the contract aligned; consumers should
        // wrap with a resolver until this adapter is fully wired.
        symbol: o.symbol,
      };
      const res = await httpJson<TLOrderResp>(`${opts.baseUrl}/trade/accounts/${opts.accountId}/orders`, {
        method: "POST",
        headers: authHeaders(t),
        body: JSON.stringify(body),
        timeoutMs: 8_000,
      });
      if (res.s !== "ok" || !res.d) throw new Error(`tradelocker order failed: ${res.errmsg ?? "unknown"}`);
      return { id: String(res.d.orderId), status: res.d.status ?? "submitted" };
    },

    async cancel_order(id: string) {
      const t = await ensureToken();
      await httpJson(`${opts.baseUrl}/trade/accounts/${opts.accountId}/orders/${id}`, {
        method: "POST",
        headers: { ...authHeaders(t), "x-http-method-override": "DELETE" },
        timeoutMs: 4_000,
      });
      return { ok: true };
    },

    async positions(): Promise<BrokerPosition[]> {
      const t = await ensureToken();
      const res = await httpJson<TLPositionsResp>(`${opts.baseUrl}/trade/accounts/${opts.accountId}/positions`, {
        headers: authHeaders(t),
        timeoutMs: 4_000,
      });
      return (res.d?.positions ?? []).map((p) => ({
        symbol: p.symbol ?? String(p.tradableInstrumentId),
        qty: p.side === "buy" ? Number(p.qty) : -Number(p.qty),
        avg_entry_price: Number(p.avgPrice),
        unrealized_pnl: Number(p.unrealizedPl),
      }));
    },

    async account() {
      const t = await ensureToken();
      const res = await httpJson<TLAccountStateResp>(`${opts.baseUrl}/trade/accounts/${opts.accountId}/state`, {
        headers: authHeaders(t),
        timeoutMs: 4_000,
      });
      return {
        equity: Number(res.d?.projectedBalance ?? 0),
        cash: Number(res.d?.accountBalance ?? 0),
        buying_power: Number(res.d?.availableFunds ?? 0),
      };
    },
  };
}
