# TradingView integration

TradeStack's core surface is built on **public TradingView endpoints** — no scraping, no logged-in cookies, no Terms-of-Service ambiguity for the read paths.

## Endpoints we use

| Endpoint | Method | Auth | Used by |
|---|---|---|---|
| `https://scanner.tradingview.com/{market}/scan` | POST | none | `screener_query` |
| `https://symbol-search.tradingview.com/symbol_search/` | GET | none | `symbol_search` |
| `https://www.tradingview.com/snapshot/{id}.png` | GET | none | `chart_snapshot` |
| `https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=admin&v=3` | POST (multipart) | none | `pine_compile` |

## Markets supported by the scanner

`america`, `europe`, `asia`, `uk`, `india`, `crypto`, `forex` — and any other `{market}` segment TradingView exposes publicly. The scanner returns paged results with up to 200 rows per request.

## Pine compiler (the differentiator)

The `pine-facade` endpoint accepts PineScript source as a multipart form field named `source` and returns either:

```json
{ "success": true }
```

or

```json
{
  "success": false,
  "error": "...",
  "errors": [{ "line": 12, "column": 5, "message": "Undeclared identifier 'foo'" }]
}
```

This is the **real TradingView compiler**, not a local parser. We use 7-second timeout with graceful fallback (`transport_error: true`). Discovered by [erevus-cn/pinescript_syntax_checker](https://github.com/erevus-cn/pinescript_syntax_checker).

## Filters and operators

The scanner exposes 18 filter operators. Notable ones:

| Op | Meaning |
|---|---|
| `greater` / `less` | strict comparison |
| `egreater` / `eless` | inclusive |
| `in_range` / `not_in_range` | bounded |
| `crosses_above` / `crosses_below` | golden / death cross detection |
| `above%` / `below%` | percent offset from another field |
| `has` / `has_none_of` | list membership |
| `empty` / `nempty` | null check |

## Rate limits

The scanner has no published limits; we cap at **60 req/min** in `src/lib/http.ts` and cache results for 60s. Don't bypass.

## Gotchas

- Symbols in the scanner come back as `"exchange:ticker"`. Strip for display, keep for round-trips.
- The `Recommend.All` column is the famous "Strong Buy / Strong Sell" rating — composite of moving averages and oscillators.
- Snapshot URLs are immutable per-id; they don't include drawings or session state.
- `pine-facade` versioning lags the IDE — `//@version=6` accepted today, but always pass through what the user wrote.

## What this MCP **does not** do against TradingView

- We do not run Chrome DevTools against TV Desktop in core (that path exists as an opt-in `tradestack-cdp` extension package).
- We do not scrape private indicator output via the chart_session WebSocket.
- We do not log into a user's TradingView account.

These choices are deliberate. See `CLAUDE.md` → "Architectural rules → ToS-clean by default".
