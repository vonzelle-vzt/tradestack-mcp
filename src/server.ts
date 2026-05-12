#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { loadConfig } from "./lib/config.js";
import { log, setLogLevel } from "./lib/logger.js";
import { allTools } from "./tools/index.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  setLogLevel(cfg.logLevel);

  log.info("tradestack-mcp starting", {
    transport: cfg.transport,
    tools: allTools.length,
    supabase: Boolean(cfg.supabase),
    webhook: Boolean(cfg.webhook),
  });

  const server = new Server(
    { name: "tradestack-mcp", version: "0.1.0" },
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
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      };
    }
    try {
      const parsed = tool.inputSchema.parse(req.params.arguments ?? {});
      const result = await tool.handler(parsed);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: (err as Error).message }],
      };
    }
  });

  if (cfg.transport === "stdio") {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log.info("tradestack-mcp listening on stdio");
  } else {
    log.error("HTTP transport is roadmapped — use stdio for now. See CLAUDE.md.");
    process.exit(1);
  }
}

main().catch((err) => {
  log.error("fatal", { err: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
