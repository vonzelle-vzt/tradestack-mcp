# cTrader integration

cTrader (built by Spotware) has the **cleanest broker-neutral API** of any retail platform. The Open API works with any cTrader-affiliated broker — IC Markets, Pepperstone, FxPro, FP Markets, etc.

## Open API

- **Spec:** [openapi.ctrader.com](https://openapi.ctrader.com/)
- **Auth:** OAuth 2.0 — register an app, get client_id/client_secret, redirect user to grant access, exchange code for access_token.
- **Transport:** Protocol Buffers over TCP with TLS (port 5035 demo, 5036 live), OR JSON over WebSocket via the Open API JSON adapter.

## Why it's nice

- Single API across all cTrader brokers (compare to MT5 where you fight per-broker symbol/server quirks).
- True FIX-like message contract — explicit `ProtoOAOrderType`, `ProtoOAExecutionType`, etc.
- Spot for forex, plus futures and stock CFDs on supporting brokers.

## Plugin contract

```typescript
const ctrader: BrokerPlugin = {
  name: "ctrader",
  kind: "broker",
  capabilities: ["forex", "crypto", "stocks"],
  async place_order(o) { /* ProtoOANewOrderReq */ },
  async cancel_order(id) { /* ProtoOACancelOrderReq */ },
  async positions() { /* ProtoOAGetPositionUnrealizedPnLReq + ProtoOATraderReq */ },
  async account() { /* ProtoOATraderReq */ },
};
registerBroker(ctrader);
```

Env vars:

```
CTRADER_CLIENT_ID=
CTRADER_CLIENT_SECRET=
CTRADER_REDIRECT_URI=
```

## Gotchas

- Two endpoints exist for every operation: one against demo accounts, one against live. Pick by `accountType` returned from the trader info call.
- Order quantities use `volumeInLots * 100` for forex (1 lot = 100,000 units; API expects centi-lots). Many SDK bugs trace back to this.
- Heartbeat every 10s or you get disconnected.
