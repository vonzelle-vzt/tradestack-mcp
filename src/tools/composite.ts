import { z } from "zod";
import { getStateBackend } from "../state/index.js";
import { currentUserId } from "../lib/context.js";
import { loadConfig } from "../lib/config.js";

const backend = () => getStateBackend(loadConfig());

const conditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["lt", "lte", "gt", "gte", "eq", "between"]),
  value: z.union([z.number(), z.tuple([z.number(), z.number()])]),
});

export const compositeUpsertSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  conditions: z.array(conditionSchema).min(1).max(10),
  logic: z.enum(["all", "any"]).default("all"),
  expires_at: z.string().optional().nullable(),
});

export const compositeUpsertTool = {
  name: "alert_composite",
  description:
    "Create or replace a composite (multi-condition) alert. TradingView alerts only support a single condition; this MCP orchestrates AND/OR logic across many on top. Conditions reference indicator fields (e.g. 'rsi', 'close') and are evaluated against incoming alert payloads.",
  inputSchema: compositeUpsertSchema,
  handler: async (input: z.infer<typeof compositeUpsertSchema>) => {
    return backend().compositeUpsert(currentUserId(), {
      name: input.name,
      symbol: input.symbol,
      conditions: input.conditions,
      logic: input.logic,
      expires_at: input.expires_at ?? null,
    });
  },
};

export const compositeListTool = {
  name: "alert_composite_list",
  description: "List all composite alerts for the current user.",
  inputSchema: z.object({}),
  handler: async () => backend().compositeList(currentUserId()),
};

export const compositeDeleteSchema = z.object({ name: z.string().min(1) });

export const compositeDeleteTool = {
  name: "alert_composite_delete",
  description: "Delete a composite alert by name. Returns { deleted: true } if the alert existed.",
  inputSchema: compositeDeleteSchema,
  handler: async ({ name }: z.infer<typeof compositeDeleteSchema>) => ({
    deleted: await backend().compositeDelete(currentUserId(), name),
  }),
};

const evalConditionSchema = z.object({
  name: z.string().min(1),
  observation: z.record(z.union([z.number(), z.string(), z.boolean()])),
});

function evaluate(value: unknown, op: string, target: number | [number, number]): boolean {
  if (typeof value !== "number") return false;
  if (op === "between" && Array.isArray(target)) {
    return value >= target[0] && value <= target[1];
  }
  const t = target as number;
  switch (op) {
    case "lt":
      return value < t;
    case "lte":
      return value <= t;
    case "gt":
      return value > t;
    case "gte":
      return value >= t;
    case "eq":
      return value === t;
    default:
      return false;
  }
}

export const compositeEvaluateTool = {
  name: "alert_composite_evaluate",
  description:
    "Evaluate a composite alert against a current observation (a map of field → value). Returns which conditions matched and whether the alert fires given its logic.",
  inputSchema: evalConditionSchema,
  handler: async ({ name, observation }: z.infer<typeof evalConditionSchema>) => {
    const composites = await backend().compositeList(currentUserId());
    const c = composites.find((c) => c.name === name);
    if (!c) return { error: "not_found", name };
    const matches = c.conditions.map((cond) => ({
      ...cond,
      observed: observation[cond.field],
      matched: evaluate(observation[cond.field], cond.op, cond.value),
    }));
    const fires = c.logic === "all" ? matches.every((m) => m.matched) : matches.some((m) => m.matched);
    return { name, symbol: c.symbol, logic: c.logic, fires, matches };
  },
};
