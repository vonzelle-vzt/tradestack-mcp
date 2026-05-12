import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { BrokerOrder, BrokerPlugin } from "../types.js";

/**
 * NinjaTrader 8 ATI file-based adapter. Writes PLACE / CANCEL command files
 * to NT8's incoming folder; responses are read from outgoing files written
 * by NT.
 *
 * Status: alpha — file IO surface is correct per ATI docs, but position
 * queries require a small companion NinjaScript add-on to dump positions
 * to a watched JSON file. Until that's wired, account() and positions()
 * read a JSON file if present and otherwise return placeholders.
 *
 * Reference: https://ninjatrader.com/support/helpguides/nt8/automated_trading_interface_at.htm
 */

function nt8Action(side: BrokerOrder["side"]): string {
  return side.toUpperCase();
}

function nt8OrderType(t: BrokerOrder["type"]): string {
  switch (t) {
    case "market":
      return "MARKET";
    case "limit":
      return "LIMIT";
    case "stop":
      return "STOPMARKET";
    case "stop_limit":
      return "STOPLIMIT";
  }
}

export function createNinjaTraderAtiBroker(atiPath: string): BrokerPlugin {
  if (!existsSync(atiPath)) {
    // Don't throw at construction — only at first use, so a misconfigured
    // env doesn't block server startup.
  }

  async function writeCommand(line: string): Promise<void> {
    if (!existsSync(atiPath)) {
      await mkdir(atiPath, { recursive: true });
    }
    const file = join(atiPath, `tradestack_${Date.now()}.txt`);
    await writeFile(file, line + "\n", "utf8");
  }

  return {
    name: "ninjatrader-ati",
    kind: "broker",
    capabilities: ["futures"],

    async place_order(o: BrokerOrder) {
      // Format: PLACE;<account>;<instrument>;<action>;<qty>;<type>;<limitPrice>;<stopPrice>;<TIF>;<oco>;<orderName>;<strategy>;<strategyId>
      const line = [
        "PLACE",
        "Sim101", // user typically overrides; v0.7 hardcodes Sim101 — wire to env in v0.8
        o.symbol,
        nt8Action(o.side),
        o.qty,
        nt8OrderType(o.type),
        o.limit_price ?? 0,
        o.stop_price ?? 0,
        o.tif?.toUpperCase() ?? "DAY",
        "",
        o.client_order_id ?? "",
        "",
        "",
      ].join(";");
      await writeCommand(line);
      return { id: o.client_order_id ?? `nt-${Date.now()}`, status: "submitted" };
    },

    async cancel_order(id: string) {
      await writeCommand(`CANCEL;${id}`);
      return { ok: true };
    },

    async positions() {
      const file = join(atiPath, "tradestack_positions.json");
      if (!existsSync(file)) return [];
      try {
        const raw = await readFile(file, "utf8");
        return JSON.parse(raw);
      } catch {
        return [];
      }
    },

    async account() {
      const file = join(atiPath, "tradestack_account.json");
      if (!existsSync(file)) return { equity: 0, cash: 0, buying_power: 0 };
      try {
        const raw = await readFile(file, "utf8");
        return JSON.parse(raw);
      } catch {
        return { equity: 0, cash: 0, buying_power: 0 };
      }
    },
  };
}
