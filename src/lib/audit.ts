import { log } from "./logger.js";

export interface ToolCallAuditEntry {
  tool: string;
  user_id: string;
  duration_ms: number;
  ok: boolean;
  error?: string;
  arg_keys: string[];
}

export function auditToolCall(entry: ToolCallAuditEntry): void {
  // Logger writes JSONL to stderr. Suitable for log shippers (Vector / fluentbit).
  // Future: optional persistence to Supabase audit_log table.
  log.info("audit.tool_call", {
    audit: true,
    tool: entry.tool,
    user_id: entry.user_id,
    duration_ms: entry.duration_ms,
    ok: entry.ok,
    error: entry.error,
    arg_keys: entry.arg_keys,
  });
}

export async function withAudit<T>(tool: string, userId: string, args: unknown, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    const result = await fn();
    auditToolCall({
      tool,
      user_id: userId,
      duration_ms: Date.now() - t0,
      ok: true,
      arg_keys: args && typeof args === "object" ? Object.keys(args as Record<string, unknown>) : [],
    });
    return result;
  } catch (err) {
    auditToolCall({
      tool,
      user_id: userId,
      duration_ms: Date.now() - t0,
      ok: false,
      error: (err as Error).message,
      arg_keys: args && typeof args === "object" ? Object.keys(args as Record<string, unknown>) : [],
    });
    throw err;
  }
}
