# MetaTrader 5 integration

MT5 is the dominant retail forex platform and the backbone of FTMO, FundedNext, The5ers, and most non-US prop firms.

## Integration paths

| Path | What it is | Best when |
|---|---|---|
| **Official `MetaTrader5` Python package** | IPC to a local terminal running on Windows | You're scripting locally |
| **MetaApi (cloud)** | Hosted MT5 gateway, REST + WebSocket SDK | You're hosting TradeStack remotely |
| **DevCartel pymt5 gateway** | Local gateway exposing socket interface | Multi-language interop |
| **MTsocketAPI** | Commercial socket bridge | Linux/remote management |
| **Custom FastAPI bridge** | Roll your own around the official Python package | Full control, single account |

For TradeStack's hosted deployments, **MetaApi** is the default — it doesn't require a Windows host.

## Plugin contract

```typescript
const mt5: BrokerPlugin = {
  name: "metatrader5-metaapi",
  kind: "broker",
  capabilities: ["forex", "futures", "crypto", "stocks"],
  async place_order(o) { /* POST /users/current/accounts/{id}/trade */ },
  async cancel_order(id) { /* POST /trade with action=ORDER_CANCEL */ },
  async positions() { /* GET /users/current/accounts/{id}/positions */ },
  async account() { /* GET /users/current/accounts/{id}/account-information */ },
};
registerBroker(mt5);
```

Env vars:

```
METAAPI_TOKEN=
METAAPI_ACCOUNT_ID=
```

## MT5 quirks

- **Trade actions are not "buy/sell".** MT5 uses `DEAL_TYPE_BUY`, `DEAL_TYPE_SELL`, and a 9-state order workflow (placed → partial → done). Normalize before exposing.
- **Symbols include broker suffixes.** EURUSD on broker A is `EURUSD`; on broker B it's `EURUSD.r` or `EURUSD-Pro`. Maintain a per-account symbol map.
- **Magic number convention.** Every order should carry a magic int identifying TradeStack. We use `0x7AC5` (29381) by default — override per plugin.
- **Account leverage shifts margin math.** Position sizing must read the account's reported leverage, not assume one.

## Prop firm notes

Most MT5 prop firms enforce rules server-side:
- **FTMO**: max daily loss, max total loss, profit target, weekend hold rules.
- **FundedNext**: similar plus consistency rules.

These are not in the MT5 protocol — TradeStack's `risk` tool family enforces them client-side before order routing.
