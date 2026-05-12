export type Transport = "stdio" | "http";

export interface Config {
  transport: Transport;
  httpPort: number;
  httpHost: string;
  logLevel: "debug" | "info" | "warn" | "error";
  supabase: { url: string; serviceRoleKey: string } | null;
  webhook: { baseUrl: string; sharedSecret: string } | null;
}

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export function loadConfig(): Config {
  const transport = (readEnv("MCP_TRANSPORT") ?? "stdio") as Transport;
  const httpPort = Number(readEnv("MCP_HTTP_PORT") ?? 3000);
  const httpHost = readEnv("MCP_HTTP_HOST") ?? "0.0.0.0";
  const logLevel = (readEnv("LOG_LEVEL") ?? "info") as Config["logLevel"];

  const supabaseUrl = readEnv("SUPABASE_URL");
  const supabaseKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase =
    supabaseUrl && supabaseKey ? { url: supabaseUrl, serviceRoleKey: supabaseKey } : null;

  const webhookBase = readEnv("WEBHOOK_BASE_URL");
  const webhookSecret = readEnv("WEBHOOK_SHARED_SECRET");
  const webhook =
    webhookBase && webhookSecret ? { baseUrl: webhookBase, sharedSecret: webhookSecret } : null;

  return { transport, httpPort, httpHost, logLevel, supabase, webhook };
}
