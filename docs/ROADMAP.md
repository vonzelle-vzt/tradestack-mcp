# Roadmap

## v0.1 (current — alpha)

- ✅ TypeScript ESM scaffold, MCP SDK over stdio
- ✅ `screener_query`, `symbol_search`, `pine_compile`, `chart_snapshot`, `risk_position_size`, `watchlist_*`
- ✅ Plugin contracts: `BrokerPlugin`, `CodegenPlugin`, `ScannerPlugin`, `DataFeedPlugin`
- ✅ Supabase schema for state (`supabase/schema.sql`)
- ✅ Platform integration docs

## v0.2 — Persistence + HTTP transport

- [ ] Wire `src/state/supabase.ts` adapter; swap from in-memory Map
- [ ] Streamable HTTP transport in `src/server.ts`
- [ ] OAuth/Supabase Auth for hosted multi-tenant
- [ ] Per-user `WEBHOOK_SHARED_SECRET` rotation
- [ ] vitest coverage to 70%

## v0.3 — Webhook ingress

- [ ] `POST /webhook/:user_token` (Hono microserver under HTTP transport)
- [ ] `alerts_recent` MCP tool
- [ ] SSE stream resource for live alert subscription
- [ ] HMAC verification + replay protection

## v0.4 — Real OHLCV + indicators

- [ ] `polygon` data-feed plugin (in-tree)
- [ ] `alpaca` data-feed plugin (in-tree)
- [ ] `symbol_ohlcv` tool routing to selected feed
- [ ] `chart_snapshot` returns structured indicators when feed is registered

## v0.5 — Composite alerts + lifecycle

- [ ] `alert_composite` tool — multi-condition orchestration
- [ ] `alert_chain` tool — sequential conditions
- [ ] `lifecycle_replay`, `lifecycle_paper`, `lifecycle_promote` tools
- [ ] Statistical gates: Sharpe > X, max DD < Y, N > Z trades

## v0.6 — Codegen + cross-platform

- [ ] `CodegenPlugin` contract finalized (Pine → NT8/MT5/TradeLocker)
- [ ] Reference codegen plugin (community / VZT TradeScriptAI plug)
- [ ] `validate` endpoint hits real compilers per target

## v0.7 — Broker adapters

- [ ] `tradelocker` in-tree adapter (REST + Streams)
- [ ] `metaapi` in-tree adapter (MT5 cloud)
- [ ] `alpaca` in-tree adapter
- [ ] `ctrader` Open API adapter
- [ ] `ninjatrader-ati` local adapter

## v0.8 — Risk-aware execution

- [ ] `order_route` tool that wraps any registered broker with risk gates
- [ ] Pre-trade compliance check (prop firm rule set)
- [ ] Portfolio VaR + correlation matrix tools

## v1.0 — Production

- [ ] Published to npm + Anthropic MCP directory + PulseMCP + Smithery
- [ ] One-click deploy to Vercel for hosted users
- [ ] Audit log + per-user analytics
- [ ] Docs site at tradestack-mcp.com

## Out of scope (deliberately)

- UI / web app — TradeStack is headless
- Storing user credentials beyond env / Supabase user rows
- Paid feature gating in core (commercial layer is downstream)
- Direct CDP control of TV Desktop in core (separate `tradestack-cdp` extension)
