# Data feeds

TradeStack's core `symbol_ohlcv` and structured-indicator tools delegate to a registered `DataFeedPlugin`. Three production-grade options.

## Polygon.io

- Strongest US equities/options/crypto coverage; per-trade granularity available.
- REST + WebSocket; aggregates from 1m to 1mo.
- Auth: API key in `Authorization: Bearer <key>` or `?apiKey=` query param.
- Pricing: ~$79/mo for Stocks Developer (10y history); free tier is rate-limited.

## Databento

- Institutional-grade tick data with full order book depth (MBO).
- Best for microstructure / HFT research.
- Pay-per-GB plus subscription tiers; significantly more expensive.

## Alpaca

- Free 10y of 1-minute bars even for unfunded accounts.
- Integrates with their broker side, so if you trade through Alpaca, data + execution are unified.
- REST + WebSocket; SIP & IEX feeds depending on tier.

## Plugin contract

```typescript
const polygon: DataFeedPlugin = {
  name: "polygon",
  kind: "datafeed",
  capabilities: ["ohlcv", "quote", "trades"],
  async ohlcv({ symbol, timeframe, from, to, limit }) {
    // GET /v2/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{from}/{to}
  },
  async quote({ symbol }) {
    // GET /v2/last/nbbo/{symbol}
  },
};
registerDataFeed(polygon);
```

Env vars:

```
POLYGON_API_KEY=
DATABENTO_API_KEY=
ALPACA_KEY_ID=
ALPACA_SECRET_KEY=
```

## Picking a feed

| Need | Pick |
|---|---|
| Free 1m bars for backtest | Alpaca |
| Real-time L1 quotes, equities | Polygon |
| Tick + L2/L3 order book | Databento |
| Already trading on Alpaca | Alpaca (unified) |
| Crypto across exchanges | Polygon |

Most serious systems register **two feeds** — one for live, one as fallback / cross-check. TradeStack's plugin registry supports unlimited concurrent feeds; tool calls accept an optional `feed` parameter.
