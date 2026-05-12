import { createMemoryBackend } from "./memory.js";
import { createSupabaseBackend } from "./supabase.js";
import type { StateBackend } from "./types.js";
import type { Config } from "../lib/config.js";
import { log } from "../lib/logger.js";

let cached: StateBackend | null = null;

export function getStateBackend(cfg: Config): StateBackend {
  if (cached) return cached;
  if (cfg.supabase) {
    log.info("state backend: supabase");
    cached = createSupabaseBackend(cfg.supabase.url, cfg.supabase.serviceRoleKey);
  } else {
    log.info("state backend: memory (no SUPABASE_URL set)");
    cached = createMemoryBackend();
  }
  return cached;
}

export function _resetStateBackendForTests(): void {
  cached = null;
}

export type { StateBackend } from "./types.js";
