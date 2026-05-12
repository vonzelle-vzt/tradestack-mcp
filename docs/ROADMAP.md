# Roadmap

## v0.1 — Scaffold ✅

- ✅ TypeScript ESM scaffold, MCP SDK over stdio
- ✅ Core tools: `screener_query`, `symbol_search`, `pine_compile`, `chart_snapshot`, `risk_position_size`, `watchlist_*`
- ✅ Plugin contracts: `BrokerPlugin`, `CodegenPlugin`, `ScannerPlugin`, `DataFeedPlugin`
- ✅ Supabase schema for state
- ✅ Platform integration docs

## v0.2 — Persistence + HTTP transport ✅

- ✅ Pluggable `StateBackend` (memory + Supabase)
- ✅ Per-user scoping via AsyncLocalStorage
- ✅ Streamable HTTP transport with stateful sessions
- ✅ Bearer-token auth → context userId
- ✅ `webhook_token_get` / `webhook_token_rotate`

## v0.3 — Webhook ingress ✅

- ✅ `POST /webhook/:user_token` accepts TradingView alerts
- ✅ JSON, pipe-delimited, and free-form parsing
- ✅ Optional HMAC verification (`X-TradeStack-Signature`)
- ✅ `alerts_recent` MCP tool

## v0.4 — Data feeds ✅

- ✅ Polygon.io data-feed plugin (in-tree)
- ✅ Alpaca data-feed plugin (in-tree)
- ✅ `symbol_ohlcv` and `symbol_quote` tools
- ✅ Env-gated plugin bootstrap

## v0.5 — Composite alerts + lifecycle ✅

- ✅ `alert_composite`, `alert_composite_list/delete/evaluate`
- ✅ `lifecycle_start`, `lifecycle_complete`, `lifecycle_runs`, `lifecycle_promote`
- ✅ Statistical promotion gates (Sharpe/DD/trades/win_rate)
- ✅ `src/lib/metrics.ts` — Sharpe, Calmar, max-DD, profit factor

## v0.6 — Codegen ✅

- ✅ `CodegenPlugin` contract finalized
- ✅ Reference Pine→NT8 transpiler always loaded
- ✅ `codegen_transpile`, `codegen_validate`, `codegen_list`

## v0.7 — Broker adapters ✅

- ✅ `alpaca` (paper + live REST)
- ✅ `tradelocker` (REST + JWT, alpha)
- ✅ `metaapi` (MT5 cloud REST, alpha)
- ✅ `ninjatrader-ati` (file IO, alpha)
- ⚠️ `ctrader` (stub — Protobuf TCP, documented for downstream wiring)

## v0.8 — Risk-aware execution ✅

- ✅ `order_route` with sizing + pre-trade gates
- ✅ `positions_list`, `account_info`, `brokers_list`
- ✅ `risk_portfolio_var` — parametric VaR (Acklam inverse-normal)
- ✅ `risk_correlation_matrix` — Pearson across return series

## v1.0 — Production ✅ (current)

- ✅ Audit log on every tool call (`withAudit` wrapper)
- ✅ `prepublishOnly` runs typecheck + test + build
- ✅ `.npmignore` strips source/docs/tests from the published tarball
- ✅ 48+ vitest cases covering risk, state, codegen, portfolio, schemas
- ✅ Streamable HTTP + stdio transports, both smoke-verified
- ✅ 32+ MCP tools
- ⏳ npm publish (manual step — `npm publish` when ready)
- ⏳ Listing on Anthropic MCP directory / PulseMCP / Smithery
- ⏳ One-click deploy to Vercel
- ⏳ Docs site at tradestack-mcp.com

## Beyond v1.0 — Roadmap notes

- Full OAuth (Supabase Auth JWT verification) for hosted multi-tenant
- Real cTrader Open API wiring via Protobuf TCP
- NT8 companion add-on for live position queries
- Polygon WebSocket streaming
- Alpaca options
- More codegen targets (Pine → MQL5, Pine → TradeLocker EasyLanguage-ish DSL)
- Pluggable risk policy engine (prop firm rules as code)

## Out of scope (deliberately)

- UI / web app — TradeStack is headless
- Storing user credentials beyond env / Supabase rows
- Paid feature gating in core (commercial layer is downstream)
- Direct CDP control of TV Desktop in core (`tradestack-cdp` is a separate package)
