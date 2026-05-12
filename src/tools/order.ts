import { z } from "zod";
import { listPlugins } from "../plugins/registry.js";
import type { BrokerPlugin, BrokerOrder } from "../plugins/types.js";
import { riskPositionSize } from "./risk.js";

export const orderRouteSchema = z.object({
  broker: z.string().min(1).describe("Registered broker plugin name (alpaca, tradelocker, metaapi, ninjatrader-ati, ...)"),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit", "stop", "stop_limit"]),
  limit_price: z.number().positive().optional(),
  stop_price: z.number().positive().optional(),
  tif: z.enum(["day", "gtc", "ioc", "fok"]).optional(),
  client_order_id: z.string().optional(),

  // Either pass an explicit qty…
  qty: z.number().positive().optional(),

  // …or have us size from a risk budget. If both qty and risk_* are given,
  // qty wins and risk fields are recorded but not used.
  account_equity: z.number().positive().optional(),
  entry_price: z.number().positive().optional(),
  stop_for_sizing: z.number().positive().optional(),
  max_risk_pct: z.number().min(0.001).max(0.1).optional(),

  // Compliance gates (optional)
  max_position_pct: z.number().min(0).max(1).optional().describe("Reject if order qty * entry > equity * this"),
  prop_firm_daily_loss_remaining: z.number().optional().describe("If set and order would risk more than this, reject"),
  dry_run: z.boolean().default(false),
});

interface OrderRouteResult {
  status: "submitted" | "rejected" | "dry_run";
  reason?: string;
  broker?: string;
  order?: { id: string; status: string };
  computed?: { qty: number; risk: number };
}

export const orderRouteTool = {
  name: "order_route",
  description:
    "Submit an order through any registered broker with pre-trade risk gates. If qty is omitted but {account_equity, entry_price, stop_for_sizing, max_risk_pct} are provided, the tool sizes the position by fixed-fractional first. Set dry_run=true to test gates without firing the order.",
  inputSchema: orderRouteSchema,
  handler: async (input: z.infer<typeof orderRouteSchema>): Promise<OrderRouteResult> => {
    const brokers = listPlugins("broker") as BrokerPlugin[];
    const broker = brokers.find((b) => b.name === input.broker);
    if (!broker) {
      return { status: "rejected", reason: `unknown_broker:${input.broker}` };
    }

    // 1. Resolve quantity (explicit or sized).
    let qty = input.qty;
    let sizedRisk = 0;
    if (!qty) {
      if (
        input.account_equity === undefined ||
        input.entry_price === undefined ||
        input.stop_for_sizing === undefined
      ) {
        return {
          status: "rejected",
          reason: "qty required, OR (account_equity + entry_price + stop_for_sizing) for sizing",
        };
      }
      const sized = riskPositionSize({
        account_equity: input.account_equity,
        entry_price: input.entry_price,
        stop_price: input.stop_for_sizing,
        side: input.side === "buy" ? "long" : "short",
        max_risk_pct: input.max_risk_pct ?? 0.01,
        method: "fixed_fractional",
      });
      qty = sized.qty;
      sizedRisk = sized.total_risk;
      if (qty < 1) {
        return { status: "rejected", reason: "sized_qty_zero", computed: { qty, risk: sizedRisk } };
      }
    }

    // 2. Gates.
    if (input.max_position_pct !== undefined && input.account_equity !== undefined && input.entry_price !== undefined) {
      const notional = qty * input.entry_price;
      if (notional > input.account_equity * input.max_position_pct) {
        return {
          status: "rejected",
          reason: `notional ${notional.toFixed(2)} exceeds max_position_pct ${input.max_position_pct * 100}% of equity`,
          computed: { qty, risk: sizedRisk },
        };
      }
    }
    if (input.prop_firm_daily_loss_remaining !== undefined && sizedRisk > input.prop_firm_daily_loss_remaining) {
      return {
        status: "rejected",
        reason: `risk ${sizedRisk.toFixed(2)} exceeds prop_firm_daily_loss_remaining ${input.prop_firm_daily_loss_remaining}`,
        computed: { qty, risk: sizedRisk },
      };
    }

    if (input.dry_run) {
      return { status: "dry_run", broker: broker.name, computed: { qty, risk: sizedRisk } };
    }

    // 3. Fire.
    const o: BrokerOrder = {
      symbol: input.symbol,
      side: input.side,
      qty,
      type: input.type,
      limit_price: input.limit_price,
      stop_price: input.stop_price,
      tif: input.tif,
      client_order_id: input.client_order_id,
    };
    const placed = await broker.place_order(o);
    return { status: "submitted", broker: broker.name, order: placed, computed: { qty, risk: sizedRisk } };
  },
};

export const positionsListSchema = z.object({ broker: z.string().min(1) });
export const positionsListTool = {
  name: "positions_list",
  description: "List open positions on a registered broker.",
  inputSchema: positionsListSchema,
  handler: async ({ broker }: z.infer<typeof positionsListSchema>) => {
    const brokers = listPlugins("broker") as BrokerPlugin[];
    const b = brokers.find((x) => x.name === broker);
    if (!b) return { error: "unknown_broker", broker };
    return { broker, positions: await b.positions() };
  },
};

export const accountInfoSchema = z.object({ broker: z.string().min(1) });
export const accountInfoTool = {
  name: "account_info",
  description: "Return equity, cash, and buying power for a registered broker.",
  inputSchema: accountInfoSchema,
  handler: async ({ broker }: z.infer<typeof accountInfoSchema>) => {
    const brokers = listPlugins("broker") as BrokerPlugin[];
    const b = brokers.find((x) => x.name === broker);
    if (!b) return { error: "unknown_broker", broker };
    return { broker, account: await b.account() };
  },
};

export const brokersListSchema = z.object({});
export const brokersListTool = {
  name: "brokers_list",
  description: "List all registered broker plugins and their capabilities.",
  inputSchema: brokersListSchema,
  handler: async () => {
    const brokers = listPlugins("broker") as BrokerPlugin[];
    return brokers.map((b) => ({ name: b.name, capabilities: b.capabilities }));
  },
};
