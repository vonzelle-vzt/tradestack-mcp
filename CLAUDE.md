# TradeStack MCP — Always Instructions for Claude Code

These instructions are read on every Claude Code session in this repo. Follow them strictly.

## Project identity

- **Product name:** TradeStack MCP (always two words, capital T and S, no space in `tradestack-mcp` package).
- **Tagline:** *Market Context Protocol for TradingView. Connect. Query. Analyze. Trade Smarter.*
- **License:** MIT. Every new file must be MIT-compatible. Reject GPL/AGPL deps.
- **Author/maintainer:** VZT Tech Consulting (`vonzelle-vzt` on GitHub).
- **Status:** Alpha. Breaking changes allowed; document in `CHANGELOG.md`.

## Architectural rules (non-negotiable)

1. **Standalone product.** TradeStack has zero hard dependency on TradeScriptAI, SmartCopy, GeminiFX, or any other VZT property. Those are *consumers/plugins*, never imports.
2. **Plugin contracts before features.** New integrations (broker, codegen, scanner, data feed) must implement an interface in `src/plugins/types.ts`. Never hard-wire a vendor into a tool.
3. **ToS-clean by default.** Core ships only public TradingView endpoints (scanner, pine-facade, snapshot images) and pure-local math. Anything that scrapes private TV state goes behind an opt-in plugin labeled `experimental` and documented.
4. **MCP SDK only.** Use `@modelcontextprotocol/sdk` types. No bespoke JSON-RPC.
5. **Typed end-to-end.** Tool args use `zod` schemas. No `any`. `tsc --noEmit` must pass before commit.
6. **Two transports.** `stdio` (default, for Claude Desktop) and `streamable-http` (for hosted). Both selected via `MCP_TRANSPORT` env. Never assume one.
7. **State is optional.** Supabase persistence is opt-in via env. The server must start and serve all read-only tools with no env set.
8. **Secrets via env, never code.** No hardcoded keys, tokens, account IDs.

## Coding standards

- TypeScript ESM (`"type": "module"`). Imports must include the `.js` extension (NodeNext resolution).
- File names: `kebab-case.ts`. Symbols: `camelCase`/`PascalCase`. Tool names: `snake_case` (MCP convention).
- One tool per file under `src/tools/`. Export `default` a `ToolDefinition`.
- Schemas live next to handlers. No anemic type files.
- Tests with `vitest`, named `*.test.ts`, colocated.
- No comments that just describe what the next line does. Comments explain *why* a non-obvious choice was made.

## Tool authoring checklist

When adding a new tool:

1. Add to `src/tools/<name>.ts` exporting `{ name, description, inputSchema, handler }`.
2. Register in `src/tools/index.ts`.
3. Document in `docs/TOOLS.md` (table row + example).
4. Add at least one vitest covering happy path and one failure mode.
5. If it hits the network, route through `src/lib/http.ts` (rate-limited, cached, timeout-bounded).
6. If it returns data the user might want to persist, expose it via the relevant `state.*` tool — never persist implicitly.

## What NOT to do

- Don't add UI. TradeStack is headless. UIs live in consumer products.
- Don't add a database driver other than Supabase (`@supabase/supabase-js`). State should remain swappable but adapter goes through `src/state/`.
- Don't write to TradingView Desktop unless the user explicitly opts into the CDP plugin (separate `tradestack-cdp` extension package, not in core).
- Don't ship credentials in `examples/`. Use placeholders.
- Don't break the `npx -y tradestack-mcp` zero-config path. The binary must run with no env vars and surface tools that work.

## When working with Pine Script

- Use `pine-facade.tradingview.com/pine-facade/translate_light` as the source of truth for compilation.
- 5-second timeout, graceful fallback returns `{ success: false, transport_error: true }`.
- The facade is undocumented — wrap parse logic so we can swap or extend without touching tool code.

## Commit & PR rules

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- One concern per PR. README/changelog updates included.
- Never commit `.env`, `node_modules`, or `dist`.

## When asked to "add a platform"

The flow is always:
1. Read `docs/platforms/<existing>.md` to mirror the structure.
2. Implement the plugin against `BrokerPlugin` / `DataFeedPlugin` / etc.
3. Add env keys to `.env.example`.
4. Add a row to the README platform table.
5. Add a `docs/platforms/<new>.md` with auth, endpoints, rate limits, gotchas.

## When in doubt

Ask the user. Don't invent product direction. This file is the contract.
