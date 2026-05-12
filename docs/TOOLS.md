# Tool reference

Every tool TradeStack exposes, what it does, and its argument schema. Schemas are zod, transmitted over MCP as JSON Schema.

## `screener_query`

Wraps TV's public scanner endpoint.

| Field | Type | Default | Notes |
|---|---|---|---|
| `market` | enum | `america` | One of `america`, `crypto`, `forex`, `europe`, `asia`, `uk`, `india` |
| `filters` | array | `[]` | Array of `{ left, operation, right }` |
| `columns` | array | `["name","close","volume","market_cap_basic","RSI"]` | Up to ~180 fields available |
| `sort` | object | `undefined` | `{ field, order: "asc" \| "desc" }` |
| `range` | tuple | `[0,50]` | `[offset, count]` |

### Example: find oversold large-cap US stocks

```json
{
  "market": "america",
  "filters": [
    { "left": "market_cap_basic", "operation": "greater", "right": 10000000000 },
    { "left": "RSI", "operation": "less", "right": 30 }
  ],
  "sort": { "field": "RSI", "order": "asc" },
  "range": [0, 25]
}
```

## `symbol_search`

| Field | Type | Default |
|---|---|---|
| `query` | string | required |
| `exchange` | string | empty (any) |
| `type` | enum | empty (any) |
| `limit` | int | 10 |

## `pine_compile`

Posts source to `pine-facade.tradingview.com`. Returns `{ success, errors[], transport_error? }`.

```json
{
  "source": "//@version=6\nindicator(\"hello\")\nplot(close)"
}
```

## `chart_snapshot`

Returns a URL pointing to TV's PNG snapshot endpoint plus structured metadata.

```json
{ "symbol": "NASDAQ:AAPL", "interval": "D", "studies": ["RSI"] }
```

> v0 returns image URL only. Structured indicator values land when a `DataFeedPlugin` is registered.

## `risk_position_size`

Pure local math. Three methods: `fixed_fractional` (default), `kelly` (half-Kelly, capped 25%), `vol_target`.

```json
{
  "account_equity": 50000,
  "entry_price": 100,
  "stop_price": 97,
  "side": "long",
  "max_risk_pct": 0.01,
  "method": "fixed_fractional"
}
```

## Watchlist tools

| Tool | Purpose |
|---|---|
| `watchlist_get` | Read by name |
| `watchlist_upsert` | Replace symbols |
| `watchlist_add` | Append a symbol |
| `watchlist_remove` | Remove a symbol |
| `watchlist_list` | Inventory of all watchlists |

> v0 uses in-memory state. Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to persist across restarts (roadmapped wiring in `src/state/`).
