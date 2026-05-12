import { z } from "zod";
import { getStateBackend } from "../state/index.js";
import { currentUserId } from "../lib/context.js";
import { loadConfig } from "../lib/config.js";

const backend = () => getStateBackend(loadConfig());

export const alertsRecentSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});

export const alertsRecentTool = {
  name: "alerts_recent",
  description:
    "Return recent inbound alerts for the current user (most recent first). Captures TradingView webhook fires and composite alert outcomes. Set up the receiving URL via webhook_token_get / webhook_token_rotate.",
  inputSchema: alertsRecentSchema,
  handler: async ({ limit }: z.infer<typeof alertsRecentSchema>) => {
    const events = await backend().alertsRecent(currentUserId(), limit);
    return { count: events.length, events };
  },
};
