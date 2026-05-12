# Plugin SDK

TradeStack's plugin system lets you extend the MCP without forking. Four contracts:

- `BrokerPlugin` — order routing and account state
- `CodegenPlugin` — language transpilation (Pine ↔ NT8 ↔ MT5 ↔ TradeLocker)
- `ScannerPlugin` — custom market scans
- `DataFeedPlugin` — OHLCV, quotes, trades

All contracts live in [`src/plugins/types.ts`](../src/plugins/types.ts).

## Writing a broker plugin

```typescript
import { registerBroker } from "tradestack-mcp/plugins";
import type { BrokerPlugin } from "tradestack-mcp/plugins";

const myBroker: BrokerPlugin = {
  name: "my-broker",
  kind: "broker",
  capabilities: ["stocks", "crypto"],

  async place_order(o) {
    // POST to your broker. Return { id, status }.
    return { id: "abc123", status: "accepted" };
  },

  async cancel_order(id) {
    return { ok: true };
  },

  async positions() {
    return []; // BrokerPosition[]
  },

  async account() {
    return { equity: 100000, cash: 50000, buying_power: 200000 };
  },
};

registerBroker(myBroker);
```

## Writing a data-feed plugin

```typescript
import { registerDataFeed } from "tradestack-mcp/plugins";

registerDataFeed({
  name: "polygon",
  kind: "datafeed",
  capabilities: ["ohlcv", "quote", "trades"],
  async ohlcv({ symbol, timeframe, from, to, limit }) {
    // ... fetch from Polygon, normalize, return { bars: [...] }
    return { bars: [] };
  },
  async quote({ symbol }) {
    return { bid: 0, ask: 0, last: 0, ts: new Date().toISOString() };
  },
});
```

## Writing a codegen plugin

```typescript
import { registerCodegen } from "tradestack-mcp/plugins";

registerCodegen({
  name: "pine-to-ninjascript",
  kind: "codegen",
  source_languages: ["pinescript"],
  target_languages: ["ninjascript"],
  async transpile({ source, from, to }) {
    // ... do the transpile
    return { code: "// NT8 strategy", warnings: [] };
  },
  async validate({ code, language }) {
    // ... validate against the target compiler
    return { ok: true, errors: [] };
  },
});
```

## Registering at server start

There are two ways:

1. **In-tree**: import in `src/server.ts` after `loadConfig()` and call `register*()` directly. Use this for first-party plugins.
2. **Out-of-tree**: publish your plugin as `npm install tradestack-plugin-mybroker` and run via a wrapper script that imports both packages before invoking the server. We'll ship a `--plugin` CLI flag in v0.2.

## Lifecycle

- Plugins are loaded once at server startup.
- The registry is shared across tools — `risk_position_size` does *not* call a broker, but `order_route` (v0.7) will resolve `broker` by name.
- Plugins must be idempotent on register; the registry warns and overwrites if you re-register the same name.
