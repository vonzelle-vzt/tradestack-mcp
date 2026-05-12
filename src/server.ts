#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import express, { type Request, type Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { loadConfig } from "./lib/config.js";
import { log, setLogLevel } from "./lib/logger.js";
import { runWithContext } from "./lib/context.js";
import { allTools } from "./tools/index.js";
import { getStateBackend } from "./state/index.js";
import { createWebhookRouter } from "./webhook/index.js";
import { loadEnvPlugins } from "./plugins/bootstrap.js";

function buildServer(): Server {
  const server = new Server(
    { name: "tradestack-mcp", version: "0.7.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema, { target: "openApi3" }) as Record<string, unknown>,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = allTools.find((t) => t.name === req.params.name);
    if (!tool) {
      return { isError: true, content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }] };
    }
    try {
      const parsed = tool.inputSchema.parse(req.params.arguments ?? {});
      const result = await tool.handler(parsed);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: (err as Error).message }] };
    }
  });

  return server;
}

function userIdFromRequest(req: Request): string {
  const auth = req.header("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const tok = auth.slice(7).trim();
    if (tok.length > 0) return tok;
  }
  const header = req.header("x-tradestack-user");
  if (header && header.trim().length > 0) return header.trim();
  return "anonymous";
}

async function startStdio(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("tradestack-mcp listening on stdio");
}

async function startHttp(host: string, port: number): Promise<void> {
  const app = express();

  // Mount webhook router BEFORE express.json — webhook needs raw body for HMAC.
  const cfg = loadConfig();
  app.use(
    createWebhookRouter({
      backend: getStateBackend(cfg),
      sharedSecret: cfg.webhook?.sharedSecret ?? null,
    }),
  );

  app.use(express.json({ limit: "2mb" }));

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "tradestack-mcp", version: "0.7.0" });
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    const userId = userIdFromRequest(req);
    const sessionId = req.header("mcp-session-id");
    let transport: StreamableHTTPServerTransport | undefined =
      sessionId ? transports.get(sessionId) : undefined;

    if (!transport && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          if (transport) transports.set(sid, transport);
        },
      });
      transport.onclose = () => {
        if (transport?.sessionId) transports.delete(transport.sessionId);
      };
      const server = buildServer();
      await server.connect(transport);
    } else if (!transport) {
      res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "No valid session" } });
      return;
    }

    await runWithContext({ userId }, async () => {
      await transport!.handleRequest(req, res, req.body);
    });
  });

  // GET/DELETE for SSE stream + session shutdown
  const sessionRoute = async (req: Request, res: Response) => {
    const sessionId = req.header("mcp-session-id");
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(404).end();
      return;
    }
    const userId = userIdFromRequest(req);
    await runWithContext({ userId }, async () => {
      await transport.handleRequest(req, res);
    });
  };
  app.get("/mcp", sessionRoute);
  app.delete("/mcp", sessionRoute);

  app.listen(port, host, () => {
    log.info("tradestack-mcp listening on http", { host, port });
  });
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  setLogLevel(cfg.logLevel);
  loadEnvPlugins();

  log.info("tradestack-mcp starting", {
    version: "0.7.0",
    transport: cfg.transport,
    tools: allTools.length,
    supabase: Boolean(cfg.supabase),
    webhook: Boolean(cfg.webhook),
  });

  if (cfg.transport === "stdio") {
    await startStdio();
  } else if (cfg.transport === "http") {
    await startHttp(cfg.httpHost, cfg.httpPort);
  } else {
    log.error("unknown MCP_TRANSPORT", { transport: cfg.transport });
    process.exit(1);
  }
}

main().catch((err) => {
  log.error("fatal", { err: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
