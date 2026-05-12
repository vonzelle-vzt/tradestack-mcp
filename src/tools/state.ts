/**
 * Watchlist state — in-memory fallback when Supabase isn't configured.
 * When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are present, this module
 * delegates to src/state/supabase.ts (TODO).
 */
import { z } from "zod";

interface Watchlist {
  name: string;
  symbols: string[];
  note?: string;
  updated_at: string;
}

const memory = new Map<string, Watchlist>();

export const watchlistGetSchema = z.object({
  name: z.string().min(1),
});

export const watchlistUpsertSchema = z.object({
  name: z.string().min(1),
  symbols: z.array(z.string().min(1)).min(0),
  note: z.string().optional(),
});

export const watchlistAddSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
});

export const watchlistRemoveSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
});

function nowIso(): string {
  return new Date().toISOString();
}

export const watchlistGetTool = {
  name: "watchlist_get",
  description: "Return symbols and note for a named watchlist. Empty result if not found.",
  inputSchema: watchlistGetSchema,
  handler: async ({ name }: z.infer<typeof watchlistGetSchema>) =>
    memory.get(name) ?? { name, symbols: [], updated_at: nowIso() },
};

export const watchlistUpsertTool = {
  name: "watchlist_upsert",
  description: "Create or replace a named watchlist with the supplied symbols and optional note.",
  inputSchema: watchlistUpsertSchema,
  handler: async (input: z.infer<typeof watchlistUpsertSchema>) => {
    const wl: Watchlist = { ...input, updated_at: nowIso() };
    memory.set(input.name, wl);
    return wl;
  },
};

export const watchlistAddTool = {
  name: "watchlist_add",
  description: "Add a single symbol to a watchlist (creates the watchlist if missing).",
  inputSchema: watchlistAddSchema,
  handler: async ({ name, symbol }: z.infer<typeof watchlistAddSchema>) => {
    const wl = memory.get(name) ?? { name, symbols: [], updated_at: nowIso() };
    if (!wl.symbols.includes(symbol)) wl.symbols.push(symbol);
    wl.updated_at = nowIso();
    memory.set(name, wl);
    return wl;
  },
};

export const watchlistRemoveTool = {
  name: "watchlist_remove",
  description: "Remove a symbol from a watchlist. Watchlist is preserved even if it becomes empty.",
  inputSchema: watchlistRemoveSchema,
  handler: async ({ name, symbol }: z.infer<typeof watchlistRemoveSchema>) => {
    const wl = memory.get(name);
    if (!wl) return { name, symbols: [], updated_at: nowIso() };
    wl.symbols = wl.symbols.filter((s) => s !== symbol);
    wl.updated_at = nowIso();
    return wl;
  },
};

export const watchlistListTool = {
  name: "watchlist_list",
  description: "List all watchlist names with sizes.",
  inputSchema: z.object({}),
  handler: async () =>
    Array.from(memory.values()).map((w) => ({ name: w.name, size: w.symbols.length, updated_at: w.updated_at })),
};
