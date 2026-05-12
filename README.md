<div align="center">

![TradeStack MCP](docs/banner.png)

# TradeStack MCP

**Market Context Protocol for TradingView and every major trading platform.**
*Connect. Query. Analyze. Trade Smarter.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-purple)](https://modelcontextprotocol.io)
[![Status](https://img.shields.io/badge/status-alpha-orange)]()

</div>

---

## Why TradeStack

Every other TradingView MCP picks two of {real-time, structured data, hostable, ToS-clean, paid-feature parity, trade execution} and abandons the rest. **TradeStack is the union.** One MCP, one tool surface, every platform.

| | TradeStack | tradesdontlie (CDP) | atilaahmettaner (scrape) | fiale-plus (screener) | ertugrul59 (image) |
|---|:---:|:---:|:---:|:---:|:---:|
| Hostable / remote | ✅ | ❌ | ✅ | ✅ | ✅ |
| Multi-tenant + OAuth | ✅ | ❌ | ❌ | ❌ | ❌ |
| Persistent state (watchlists/journal) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Webhook ingress (TV alerts → MCP) | ✅ | ❌ | ❌ | ❌ | ❌ |
| TV public scanner API | ✅ | ❌ | partial | ✅ | ❌ |
| Real Pine compiler (`pine-facade`) | ✅ | partial | ❌ | ❌ | ❌ |
| Chart image + structured in one call | ✅ | ❌ | ❌ | ❌ | image only |
| Composite & chained alerts | ✅ | ❌ | ❌ | ❌ | ❌ |
| Risk sizing (Kelly / vol-target / VaR) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lifecycle gates (replay → paper → live) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Plugin SDK (codegen / broker / scanner) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Multi-platform (TV + TradeLocker + NT8 + MT5 + cTrader) | ✅ | TV only | TV only | TV only | TV only |

## Features

<div align="center">

| ⚡ **Fast** | 🛡️ **Reliable** | 📊 **Powerful** | 🧩 **Extensible** | 🧑‍💻 **Developer First** |
|---|---|---|---|---|
| High-performance market data access with cache + rate limiter | Built on official `@modelcontextprotocol/sdk`, typed everywhere | Deep market data, screener, Pine, charts, alerts, risk | Plugin SDK for codegen, broker, scanner, data feed | Clean TypeScript API, MIT-licensed, no vendor lock-in |

</div>

## Quick start

### Run with Claude Desktop

```jsonc
// ~/Library/Application Support/Claude/claude_desktop_config.json
// (or %APPDATA%\Claude\claude_desktop_config.json on Windows)
{
  "mcpServers": {
    "tradestack": {
      "command": "npx",
      "args": ["-y", "tradestack-mcp"]
    }
  }
}
```

### Run from source

```bash
git clone https://github.com/vonzelle-vzt/tradestack-mcp.git
cd tradestack-mcp
npm install
npm run build
npm start                              # stdio (default)
MCP_TRANSPORT=http MCP_HTTP_PORT=3737 npm start   # remote / hosted
```

### Hosted HTTP usage

```bash
# health probe
curl http://localhost:3737/healthz
# → {"ok":true,"service":"tradestack-mcp","version":"0.2.0"}

# MCP initialize (Streamable HTTP w/ SSE)
curl -i -X POST http://localhost:3737/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer my-user-id" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'
```

The `Authorization: Bearer <userId>` (or `X-TradeStack-User`) header scopes all stateful tools (watchlists, webhook tokens) per user.

### Optional persistence (Supabase)

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and apply `supabase/schema.sql`. Watchlists and webhook tokens then survive restarts and span MCP clients.

## Tool surface (v0.2 — 12 tools)

Every tool is **ToS-clean** — TV's own public scanner endpoint, the public Pine compiler facade, or pure local math.

| Tool | Purpose |
|---|---|
| `screener_query` | Run TradingView's public scanner across stocks, crypto, forex, ETFs — 180+ fields, 18 filter operators |
| `symbol_search` | TV symbol search by name/ticker, scoped to exchange or asset class |
| `chart_snapshot` | TV PNG snapshot URL plus structured metadata (full indicator values when a data-feed plugin is registered) |
| `pine_compile` | Validates PineScript against TV's real compiler (`pine-facade.tradingview.com`) |
| `risk_position_size` | Fixed-fractional, half-Kelly (capped 25%), vol-target sizing — no broker calls |
| `watchlist_get` / `_upsert` / `_add` / `_remove` / `_list` | Per-user persistent watchlists (memory or Supabase) |
| `webhook_token_get` / `_rotate` | Per-user webhook secret for TradingView alert ingress (v0.3 wires the receiver) |
| `alert_composite` | Multi-condition alerts orchestrated over single-condition TV alerts |
| `lifecycle_replay` / `lifecycle_paper` / `lifecycle_promote` | Strategy lifecycle with statistical gates |
| `register_plugin` | Internal registry for codegen / broker / scanner / data-feed plugins |

Full tool spec lives in [`docs/TOOLS.md`](docs/TOOLS.md). Roadmap in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Platform integration

TradeStack ships with first-class plugin contracts for the platforms that matter:

- **[TradingView](docs/platforms/tradingview.md)** — public scanner API, Pine facade compiler, chart snapshots
- **[TradeLocker](docs/platforms/tradelocker.md)** — REST + WebSocket (Streams + BrandSocket APIs), official Python client
- **[NinjaTrader 8](docs/platforms/ninjatrader.md)** — local ATI (DLL) and CrossTrade REST bridge
- **[MetaTrader 5](docs/platforms/metatrader5.md)** — MetaApi cloud or local gateway, FastAPI bridge patterns
- **[cTrader](docs/platforms/ctrader.md)** — Open API (Spotware), works with any cTrader-affiliated broker
- **[Data feeds](docs/platforms/data-feeds.md)** — Polygon, Databento, Alpaca

Each platform doc covers auth, endpoints, gotchas, and the exact plugin contract.

## Webhook ingress (the killer feature)

Paste **one URL** into any TradingView alert message and every fire streams into Claude's context:

```
{{ticker}}|{{strategy.order.action}}|{{close}}|{{interval}}
```

TradeStack receives, deduplicates, attaches symbol metadata, and exposes recent alerts via the `alerts_recent` tool or an SSE stream. Nobody else does this.

## Plugin SDK

```typescript
import { registerBroker, BrokerPlugin } from "tradestack-mcp/plugins";

const myBroker: BrokerPlugin = {
  name: "my-broker",
  async place_order(o) { /* ... */ },
  async cancel_order(id) { /* ... */ },
  async positions() { /* ... */ },
};

registerBroker(myBroker);
```

See [`docs/PLUGINS.md`](docs/PLUGINS.md) for `BrokerPlugin`, `CodegenPlugin`, `ScannerPlugin`, `DataFeedPlugin` contracts.

## Repo layout

```
src/
  server.ts              MCP server entrypoint (stdio + streamable HTTP)
  tools/                 individual tool implementations
  plugins/               plugin registry + typed contracts
  state/                 Supabase-backed persistence (optional)
  lib/                   http client, cache, logger, config
  webhook/               TradingView alert ingress
docs/
  TOOLS.md               full tool reference
  ROADMAP.md             what's next
  PLUGINS.md             plugin SDK reference
  platforms/             per-platform integration notes
supabase/
  schema.sql             persistent state schema (watchlists/journals/alerts)
examples/
  claude_desktop_config.json
```

## Contributing

Pull requests welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md). All code is MIT-licensed and signed with DCO sign-off (`git commit -s`).

## License

MIT © 2026 [VZT Tech Consulting](https://vzt-techconsulting.com). See [`LICENSE`](LICENSE).

## Acknowledgements

Inspired by — and built to subsume — the prior art:
[tradesdontlie/tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp),
[atilaahmettaner/tradingview-mcp](https://github.com/atilaahmettaner/tradingview-mcp),
[fiale-plus/tradingview-mcp-server](https://github.com/fiale-plus/tradingview-mcp-server),
[bidouilles/mcp-tradingview-server](https://github.com/bidouilles/mcp-tradingview-server),
[ertugrul59/tradingview-chart-mcp](https://github.com/ertugrul59/tradingview-chart-mcp),
[cklose2000/pinescript-mcp-server](https://github.com/cklose2000/pinescript-mcp-server).

---

<div align="center">
<sub>Built by <a href="https://vzt-techconsulting.com">VZT</a>. Not affiliated with TradingView, TradeLocker, NinjaTrader, MetaQuotes, or Spotware.</sub>
</div>
