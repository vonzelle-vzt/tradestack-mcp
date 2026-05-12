# Changelog

All notable changes to TradeStack MCP are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
