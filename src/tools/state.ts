import { z } from "zod";
import { getStateBackend } from "../state/index.js";
import { currentUserId } from "../lib/context.js";
import { loadConfig } from "../lib/config.js";

const backend = () => getStateBackend(loadConfig());

export const watchlistGetSchema = z.object({ name: z.string().min(1) });
export const watchlistUpsertSchema = z.object({
  name: z.string().min(1),
  symbols: z.array(z.string().min(1)).min(0),
  note: z.string().optional(),
});
export const watchlistAddSchema = z.object({ name: z.string().min(1), symbol: z.string().min(1) });
export const watchlistRemoveSchema = z.object({ name: z.string().min(1), symbol: z.string().min(1) });

export const watchlistGetTool = {
  name: "watchlist_get",
  description: "Return symbols and note for a named watchlist (scoped to current user). Empty result if not found.",
  inputSchema: watchlistGetSchema,
  handler: async ({ name }: z.infer<typeof watchlistGetSchema>) => {
    const wl = await backend().watchlistGet(currentUserId(), name);
    return wl ?? { name, symbols: [], updated_at: new Date().toISOString() };
  },
};

export const watchlistUpsertTool = {
  name: "watchlist_upsert",
  description: "Create or replace a named watchlist with the supplied symbols and optional note (scoped to current user).",
  inputSchema: watchlistUpsertSchema,
  handler: async (input: z.infer<typeof watchlistUpsertSchema>) =>
    backend().watchlistUpsert(currentUserId(), { ...input, updated_at: new Date().toISOString() }),
};

export const watchlistAddTool = {
  name: "watchlist_add",
  description: "Add a single symbol to a watchlist (creates the watchlist if missing). Scoped to current user.",
  inputSchema: watchlistAddSchema,
  handler: async ({ name, symbol }: z.infer<typeof watchlistAddSchema>) =>
    backend().watchlistAdd(currentUserId(), name, symbol),
};

export const watchlistRemoveTool = {
  name: "watchlist_remove",
  description: "Remove a symbol from a watchlist. Watchlist is preserved even if it becomes empty. Scoped to current user.",
  inputSchema: watchlistRemoveSchema,
  handler: async ({ name, symbol }: z.infer<typeof watchlistRemoveSchema>) =>
    backend().watchlistRemove(currentUserId(), name, symbol),
};

export const watchlistListTool = {
  name: "watchlist_list",
  description: "List all watchlists for the current user with sizes.",
  inputSchema: z.object({}),
  handler: async () => backend().watchlistList(currentUserId()),
};

export const webhookTokenSchema = z.object({});
export const webhookTokenTool = {
  name: "webhook_token_get",
  description:
    "Return the current user's webhook token (the secret slug used in the TradingView alert webhook URL). Returns null if not yet provisioned.",
  inputSchema: webhookTokenSchema,
  handler: async () => ({ token: await backend().webhookTokenGet(currentUserId()) }),
};

export const webhookRotateTool = {
  name: "webhook_token_rotate",
  description:
    "Rotate the current user's webhook token, returning the new value. The old token immediately stops accepting inbound TradingView alerts.",
  inputSchema: webhookTokenSchema,
  handler: async () => ({ token: await backend().webhookTokenRotate(currentUserId()) }),
};
