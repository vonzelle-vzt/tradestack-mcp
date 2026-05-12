import { z } from "zod";
import { getStateBackend } from "../state/index.js";
import { currentUserId } from "../lib/context.js";
import { loadConfig } from "../lib/config.js";
import type { StrategyMetrics } from "../state/types.js";

const backend = () => getStateBackend(loadConfig());

const stages = ["replay", "paper", "live"] as const;

export const lifecycleStartSchema = z.object({
  strategy_name: z.string().min(1),
  stage: z.enum(stages),
  pine_source: z.string().optional(),
  config: z.record(z.unknown()).default({}),
});

export const lifecycleStartTool = {
  name: "lifecycle_start",
  description:
    "Open a new strategy run record at a given stage (replay, paper, or live). Returns the run ID — pass it to lifecycle_complete with metrics when the run ends.",
  inputSchema: lifecycleStartSchema,
  handler: async (input: z.infer<typeof lifecycleStartSchema>) =>
    backend().strategyRunInsert(currentUserId(), {
      strategy_name: input.strategy_name,
      stage: input.stage,
      pine_source: input.pine_source ?? null,
      config: input.config,
      metrics: null,
    }),
};

export const lifecycleCompleteSchema = z.object({
  id: z.string().uuid(),
  metrics: z.object({
    sharpe: z.number().optional(),
    calmar: z.number().optional(),
    max_dd: z.number().optional(),
    profit_factor: z.number().optional(),
    win_rate: z.number().min(0).max(1).optional(),
    n_trades: z.number().int().min(0).optional(),
    net_pnl: z.number().optional(),
  }),
});

export const lifecycleCompleteTool = {
  name: "lifecycle_complete",
  description:
    "Close out a strategy run with its final metrics (Sharpe, Calmar, max_dd, profit_factor, win_rate, n_trades, net_pnl).",
  inputSchema: lifecycleCompleteSchema,
  handler: async ({ id, metrics }: z.infer<typeof lifecycleCompleteSchema>) =>
    backend().strategyRunComplete(currentUserId(), id, metrics as StrategyMetrics),
};

export const lifecycleListSchema = z.object({ strategy_name: z.string().min(1) });

export const lifecycleListTool = {
  name: "lifecycle_runs",
  description: "List all runs for a strategy, most recent first, across replay/paper/live stages.",
  inputSchema: lifecycleListSchema,
  handler: async ({ strategy_name }: z.infer<typeof lifecycleListSchema>) =>
    backend().strategyRunsByName(currentUserId(), strategy_name),
};

export interface PromotionGate {
  min_sharpe: number;
  max_dd: number;
  min_trades: number;
  min_win_rate: number;
}

export const DEFAULT_GATES: Record<"replay_to_paper" | "paper_to_live", PromotionGate> = {
  replay_to_paper: { min_sharpe: 1.0, max_dd: 0.15, min_trades: 30, min_win_rate: 0.45 },
  paper_to_live: { min_sharpe: 1.2, max_dd: 0.12, min_trades: 50, min_win_rate: 0.5 },
};

export const lifecyclePromoteSchema = z.object({
  strategy_name: z.string().min(1),
  to: z.enum(["paper", "live"]),
  gate: z
    .object({
      min_sharpe: z.number().min(0).optional(),
      max_dd: z.number().min(0).max(1).optional(),
      min_trades: z.number().int().min(0).optional(),
      min_win_rate: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const lifecyclePromoteTool = {
  name: "lifecycle_promote",
  description:
    "Check whether the most recent completed run of a strategy clears the statistical gate for promotion to the next stage (paper or live). Returns gate pass/fail per metric; the actual move to the next stage is a separate lifecycle_start call.",
  inputSchema: lifecyclePromoteSchema,
  handler: async (input: z.infer<typeof lifecyclePromoteSchema>) => {
    const runs = await backend().strategyRunsByName(currentUserId(), input.strategy_name);
    const previousStage = input.to === "paper" ? "replay" : "paper";
    const lastCompleted = runs.find(
      (r) => r.stage === previousStage && r.ended_at !== null && r.metrics !== null,
    );
    if (!lastCompleted || !lastCompleted.metrics) {
      return { ok: false, reason: `no_completed_${previousStage}_run` };
    }
    const m = lastCompleted.metrics;
    const baseGate = input.to === "paper" ? DEFAULT_GATES.replay_to_paper : DEFAULT_GATES.paper_to_live;
    const gate = { ...baseGate, ...input.gate };
    const checks = {
      sharpe: (m.sharpe ?? 0) >= gate.min_sharpe,
      max_dd: (m.max_dd ?? 1) <= gate.max_dd,
      trades: (m.n_trades ?? 0) >= gate.min_trades,
      win_rate: (m.win_rate ?? 0) >= gate.min_win_rate,
    };
    const ok = Object.values(checks).every(Boolean);
    return { ok, gate, observed: m, checks, run_id: lastCompleted.id };
  },
};
