# NinjaTrader 8 integration

NinjaTrader is the dominant futures platform for US prop firms (Apex, Topstep, MyFundedFutures etc.). There are two viable integration paths.

## Option 1: Local ATI (Automated Trading Interface)

NinjaTrader exposes a **file-based and DLL interface** under General Options → Automated Trading Interface. When enabled, NT8 watches a folder for command files and writes execution responses back.

### Commands supported via ATI

| Command | Effect |
|---|---|
| PLACE | submit order |
| CANCEL | cancel order |
| CANCELALLORDERS | flatten everything |
| CHANGE | modify order |
| CLOSEPOSITION | flat a symbol |
| CLOSESTRATEGY | stop a running strategy |
| FLATTENEVERYTHING | panic close |
| REVERSEPOSITION | swap side |

The DLL form (`NTDirect.dll`) is C-callable: `Connected`, `Command`, `Avg`, `Pos`, `MarketPosition`, etc.

### Limitations

- **No options.** ATI cannot send option orders; NinjaScript internally also cannot.
- **No position queries via ATI alone.** You either run a small NinjaScript add-on that writes positions to disk, or use the SDK.
- Single machine only. ATI is local-only.

## Option 2: CrossTrade REST bridge

[CrossTrade](https://crosstrade.io) ships a NinjaTrader 8 add-on that exposes a remote REST API. Useful when you want to drive NT from a hosted MCP server. Trade-off: adds a paid third-party dependency.

## Plugin contract

```typescript
const ninja: BrokerPlugin = {
  name: "ninjatrader-ati",
  kind: "broker",
  capabilities: ["futures"],
  async place_order(o) { /* write PLACE command file */ },
  // ...
};
registerBroker(ninja);
```

Env vars:

```
NT8_ATI_PATH=C:\path\to\incoming\folder
# or use CrossTrade:
CROSSTRADE_API_KEY=
```

## NinjaScript codegen

For *script* generation (not just execution), TradeStack accepts a `CodegenPlugin` that emits NinjaScript Strategy or Indicator C# code. The plugin can optionally run an offline `csc.exe` compile against stub NinjaTrader types to catch hallucinated APIs before deployment — that pattern is well established (see [`feedback_nt8_mock_compiler`](../../CLAUDE.md)).

## Gotchas

- ATI is single-process. Multiple agents writing to the same incoming folder will fight. Add a queue.
- NinjaTrader licenses gate the connection — sim accounts are always free; live trading on a single broker is free; multi-broker requires a Lifetime or Lease license.
- Apex/Topstep use Rithmic data feeds via NT — order routing is gated by the firm's risk engine, not NT itself.
