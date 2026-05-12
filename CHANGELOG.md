# Changelog

All notable changes to TradeStack MCP are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05-12

### Added
- **Audit log**: every MCP tool call wrapped with `withAudit` — records tool name, user_id, duration_ms, ok/err, and arg key list to stderr JSONL (log-shipper friendly).
- **`prepublishOnly` script**: typecheck + test + build runs before any `npm publish`.
- **`.npmignore`**: strips `src/`, `docs/`, tests, and build configs from the published tarball — only `dist/`, README, LICENSE ship.
- **Final smoke verification**: stdio + HTTP transports both boot clean with 32+ tools registered.

### Changed
- Bumped to 1.0.0. Tool surface, plugin contracts, and state schema are now considered stable.
- Server, healthz, and Server instance metadata all report 1.0.0.

## [0.8.0] — 2026-05-12

### Added
- **`order_route`**: routes orders through any registered BrokerPlugin with sizing + pre-trade compliance gates (max_position_pct, prop_firm_daily_loss_remaining). `dry_run` mode exercises gates without firing.
- **`positions_list`, `account_info`, `brokers_list`**: read-only broker accessors.
- **`risk_portfolio_var`**: parametric Value-at-Risk with Acklam inverse-normal z-score, configurable confidence/horizon, uniform pairwise correlation.
- **`risk_correlation_matrix`**: Pearson correlation across a map of return series.

## [0.7.0] — 2026-05-12

### Added
- **Alpaca broker** (paper + live REST).
- **TradeLocker broker** (REST + JWT; alpha — symbol→instrumentId resolver pending).
- **MetaApi broker** (MT5 cloud REST; alpha; magic 0x7AC5).
- **NinjaTrader 8 ATI broker** (file-based command IO; alpha; sidecar JSON for positions).
- **cTrader broker** (stub — Protobuf TCP requires downstream wiring).

## [0.6.0] — 2026-05-12

### Added
- **CodegenPlugin** contract finalized.
- **Reference pine-to-nt8 plugin** transpiles PineScript indicators/strategies to NinjaScript 8 C# skeletons. Detects `indicator()` vs `strategy()`, parses `input()` declarations, rewrites the most common `ta.*` built-ins and OHLCV references.
- **`codegen_transpile` / `codegen_validate` / `codegen_list` tools**.
- **Static validator** catches the most common hallucinated NT8 properties (`ExitOnSessionClose`, `MaxDrawdown`, `AllowSelectionOnHistorical`).

## [0.5.0] — 2026-05-12

### Added
- **Composite alerts**: `alert_composite`, `alert_composite_list`, `alert_composite_delete`, `alert_composite_evaluate`. Multi-condition AND/OR logic on top of single-condition TV alerts.
- **Strategy lifecycle**: `lifecycle_start`, `lifecycle_complete`, `lifecycle_runs`, `lifecycle_promote` — tracks replay/paper/live runs with metrics.
- **Statistical promotion gates**: replay→paper requires Sharpe≥1.0, DD≤15%, ≥30 trades, win_rate≥45%; paper→live tightens to Sharpe≥1.2, DD≤12%, ≥50 trades, win_rate≥50%. Gates fully overridable per call.
- **`src/lib/metrics.ts`**: pure functions for Sharpe, Calmar, max-DD, profit factor, win rate.

## [0.4.0] — 2026-05-12

### Added
- **Polygon.io data-feed plugin** (in-tree, opt-in via `POLYGON_API_KEY`).
- **Alpaca data-feed plugin** (in-tree, opt-in via `ALPACA_KEY_ID` + `ALPACA_SECRET_KEY`).
- **`symbol_ohlcv` and `symbol_quote` tools** — route to first registered datafeed with the right capability or a named feed via the `feed` arg.

## [0.3.0] — 2026-05-12

### Added
- **Webhook ingress**: `POST /webhook/:user_token`. Parses JSON, pipe-delimited, or free-form TradingView alert bodies.
- **Optional HMAC verification** via `WEBHOOK_SHARED_SECRET` + `X-TradeStack-Signature: sha256=<hex>`.
- **`alerts_recent` MCP tool** surfaces inbound events to Claude.
- Webhook token rotation invalidates prior tokens.

## [0.2.0] — 2026-05-12

### Added
- **Streamable HTTP transport**: stateful sessions, SSE responses, `/healthz` endpoint. Toggle via `MCP_TRANSPORT=http`.
- **Per-user scoping**: `AsyncLocalStorage`-backed request context. `Authorization: Bearer <userId>` (or `X-TradeStack-User` header) flows into every tool call as `currentUserId()`.
- **Pluggable state backend**: `StateBackend` interface with `memory` and `supabase` implementations, auto-selected from env.
- **Supabase backend**: full CRUD for watchlists; `user_settings` table for webhook tokens.
- **Webhook token tools**: `webhook_token_get`, `webhook_token_rotate`. Tokens are per-user and rotatable.
- **vitest suite**: 22 tests covering risk math, memory state, schemas, request context.

### Changed
- Watchlist tools now scope by current user, no longer single-tenant.
- `package.json` bumped to 0.2.0; added `@supabase/supabase-js`, `express`, `@types/express`.

### Fixed
- `lru-cache` v11 type-constraint compatibility in `src/lib/http.ts`.

## [0.1.0] — 2026-05-12

First public alpha.

### Added
- Initial project scaffold: TypeScript ESM, MCP SDK, plugin registry.
- Core tools: `screener_query`, `symbol_search`, `pine_compile`, `chart_snapshot`, `watchlist_*`, `risk_position_size`.
- Plugin contracts: `BrokerPlugin`, `CodegenPlugin`, `ScannerPlugin`, `DataFeedPlugin`.
- Platform integration docs: TradingView, TradeLocker, NinjaTrader 8, MetaTrader 5, cTrader, Data feeds.
- Supabase schema for persistent state (`supabase/schema.sql`).
- MIT license; CLAUDE.md always-instructions; CONTRIBUTING.md.
