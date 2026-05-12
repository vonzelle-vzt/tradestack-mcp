import { z } from "zod";
import { httpForm } from "../lib/http.js";
import { log } from "../lib/logger.js";

const PINE_FACADE_URL = "https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=admin&v=3";

export const pineCompileSchema = z.object({
  source: z.string().min(1).describe("Full PineScript source. Must begin with //@version=5 or //@version=6."),
});

export interface PineCompileResult {
  success: boolean;
  errors: Array<{ line?: number; column?: number; message: string }>;
  transport_error?: boolean;
  raw?: unknown;
}

export async function pineCompile(input: z.infer<typeof pineCompileSchema>): Promise<PineCompileResult> {
  try {
    const raw = (await httpForm(
      PINE_FACADE_URL,
      { source: input.source },
      {
        headers: {
          referer: "https://www.tradingview.com/",
          dnt: "1",
        },
        timeoutMs: 7_000,
      },
    )) as { success?: boolean; error?: string; errors?: Array<{ line?: number; column?: number; message: string }> };

    return {
      success: Boolean(raw.success),
      errors: raw.errors ?? (raw.error ? [{ message: raw.error }] : []),
      raw,
    };
  } catch (err) {
    log.warn("pine compile transport error", { err: (err as Error).message });
    return { success: false, errors: [{ message: (err as Error).message }], transport_error: true };
  }
}

export const pineCompileTool = {
  name: "pine_compile",
  description:
    "Validate PineScript code using TradingView's actual compiler (pine-facade.tradingview.com). Returns line/column-level errors. Supports v5 and v6.",
  inputSchema: pineCompileSchema,
  handler: pineCompile,
};
