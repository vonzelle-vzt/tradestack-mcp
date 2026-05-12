import { screenerQueryTool } from "./screener.js";
import { symbolSearchTool } from "./symbol.js";
import { pineCompileTool } from "./pine.js";
import { chartSnapshotTool } from "./chart.js";
import { riskPositionSizeTool } from "./risk.js";
import {
  watchlistGetTool,
  watchlistUpsertTool,
  watchlistAddTool,
  watchlistRemoveTool,
  watchlistListTool,
  webhookTokenTool,
  webhookRotateTool,
} from "./state.js";
import type { z, ZodTypeAny } from "zod";

export interface ToolDefinition<S extends ZodTypeAny = ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: S;
  handler: (input: z.infer<S>) => Promise<unknown>;
}

export const allTools: ToolDefinition[] = [
  screenerQueryTool,
  symbolSearchTool,
  pineCompileTool,
  chartSnapshotTool,
  riskPositionSizeTool,
  watchlistGetTool,
  watchlistUpsertTool,
  watchlistAddTool,
  watchlistRemoveTool,
  watchlistListTool,
  webhookTokenTool,
  webhookRotateTool,
];
