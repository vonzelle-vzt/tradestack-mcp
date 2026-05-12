import { z } from "zod";
import { listPlugins } from "../plugins/registry.js";
import type { CodegenPlugin } from "../plugins/types.js";

export const codegenTranspileSchema = z.object({
  source: z.string().min(1),
  from: z.string().min(1).describe("Source language, e.g. 'pinescript'"),
  to: z.string().min(1).describe("Target language, e.g. 'ninjascript' / 'mql5' / 'tradelocker'"),
  plugin: z.string().optional().describe("Specific codegen plugin name. Defaults to the first plugin that supports the pair."),
});

export const codegenTranspileTool = {
  name: "codegen_transpile",
  description:
    "Transpile a strategy/indicator from one trading language to another via a registered CodegenPlugin. Out of the box pine-to-nt8 ships as a reference transformer. Register richer plugins (e.g. TradeScriptAI) for production-grade output.",
  inputSchema: codegenTranspileSchema,
  handler: async (input: z.infer<typeof codegenTranspileSchema>) => {
    const plugins = listPlugins("codegen") as CodegenPlugin[];
    const supporting = plugins.filter(
      (p) => p.source_languages.includes(input.from) && p.target_languages.includes(input.to),
    );
    const chosen = input.plugin
      ? supporting.find((p) => p.name === input.plugin)
      : supporting[0];
    if (!chosen) {
      return {
        error: "no_codegen_plugin",
        message: `No codegen plugin handles ${input.from} → ${input.to}.`,
        available: plugins.map((p) => ({ name: p.name, from: p.source_languages, to: p.target_languages })),
      };
    }
    const result = await chosen.transpile({ source: input.source, from: input.from, to: input.to });
    return { plugin: chosen.name, ...result };
  },
};

export const codegenValidateSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
  plugin: z.string().optional(),
});

export const codegenValidateTool = {
  name: "codegen_validate",
  description: "Validate generated code via a registered CodegenPlugin's validate() function. Returns ok + line-level errors.",
  inputSchema: codegenValidateSchema,
  handler: async (input: z.infer<typeof codegenValidateSchema>) => {
    const plugins = listPlugins("codegen") as CodegenPlugin[];
    const supporting = plugins.filter(
      (p) => typeof p.validate === "function" && p.target_languages.includes(input.language),
    );
    const chosen = input.plugin
      ? supporting.find((p) => p.name === input.plugin)
      : supporting[0];
    if (!chosen?.validate) {
      return { error: "no_validator", message: `No codegen plugin can validate ${input.language}.` };
    }
    return { plugin: chosen.name, ...(await chosen.validate({ code: input.code, language: input.language })) };
  },
};

export const codegenListSchema = z.object({});
export const codegenListTool = {
  name: "codegen_list",
  description: "List all registered codegen plugins and the language pairs they support.",
  inputSchema: codegenListSchema,
  handler: async () => {
    const plugins = listPlugins("codegen") as CodegenPlugin[];
    return plugins.map((p) => ({
      name: p.name,
      source_languages: p.source_languages,
      target_languages: p.target_languages,
      validates: typeof p.validate === "function",
    }));
  },
};
