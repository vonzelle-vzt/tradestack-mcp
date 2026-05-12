# TradeLocker integration

TradeLocker is the platform of choice for several modern prop firms. The official APIs are well-documented and split into three surfaces.

## API surfaces

| Surface | Purpose | Base URL |
|---|---|---|
| **REST API** | Account, orders, positions, historical quotes | `https://demo.tradelocker.com/backend-api/` and `https://live.tradelocker.com/backend-api/` |
| **Streams API** | Real-time market & account data for traders | `wss://api.tradelocker.com/streams-api/socket.io` (prod), `wss://api-dev.tradelocker.com/streams-api/socket.io` (dev) |
| **BrandSocket** | Real-time data for brands integrating TradeLocker | `wss://api.tradelocker.com/brand-api/` |

The official Python client is at [`TradeLocker/tradelocker-python`](https://github.com/TradeLocker/tradelocker-python).

## Auth

REST: email + password + server name → returns access token. Token is short-lived; refresh required.

Streams: pass auth token from REST handshake.

## Plugin contract

```typescript
import { registerBroker, BrokerPlugin } from "tradestack-mcp/plugins";

const tradelocker: BrokerPlugin = {
  name: "tradelocker",
  kind: "broker",
  capabilities: ["forex", "crypto", "futures"],
  async place_order(o) { /* POST /accounts/{id}/orders */ },
  async cancel_order(id) { /* DELETE /accounts/{id}/orders/{id} */ },
  async positions() { /* GET /accounts/{id}/positions */ },
  async account() { /* GET /accounts/{id}/state */ },
};
registerBroker(tradelocker);
```

Env vars (see `.env.example`):

```
TRADELOCKER_EMAIL=
TRADELOCKER_PASSWORD=
TRADELOCKER_SERVER=
TRADELOCKER_ACCOUNT_ID=
```

## Gotchas

- TradeLocker accounts are server-scoped. The server name is supplied by the broker; users often don't know it. Default to the broker's primary server, fall back to listing servers on first login.
- WebSocket disconnects are common during news events. Implement exponential backoff and resubscribe on reconnect.
- Prop firms running TradeLocker may have additional rules layered on top (max DD, trailing DD, lot limits). The REST API will accept orders that the firm's risk engine then closes — wrap with pre-flight checks.
