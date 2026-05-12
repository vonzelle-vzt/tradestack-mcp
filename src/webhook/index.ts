import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";
import type { StateBackend } from "../state/types.js";
import { log } from "../lib/logger.js";

interface WebhookOpts {
  backend: StateBackend;
  sharedSecret: string | null;
}

/**
 * Parse a TradingView alert body. TV's webhook ships either:
 *   - JSON: { "ticker": "AAPL", "action": "buy", "price": 100 }
 *   - Pipe-delimited: "AAPL|buy|100|D"
 *   - Free-form text
 * We accept all three and normalise.
 */
function parseAlert(body: unknown, rawText: string): { symbol: string | null; payload: Record<string, unknown> } {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const obj = body as Record<string, unknown>;
    const symbol =
      (typeof obj.ticker === "string" && obj.ticker) ||
      (typeof obj.symbol === "string" && obj.symbol) ||
      null;
    return { symbol, payload: obj };
  }
  if (rawText.includes("|")) {
    const [ticker, action, price, interval] = rawText.split("|").map((s) => s.trim());
    return {
      symbol: ticker ?? null,
      payload: { ticker, action, price, interval, raw: rawText },
    };
  }
  return { symbol: null, payload: { raw: rawText } };
}

function verifyHmac(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = header.replace(/^sha256=/, "");
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

export function createWebhookRouter(opts: WebhookOpts): Router {
  const router = Router();

  // Keep raw body for HMAC verification.
  router.use((req, _res, next) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      raw += chunk;
    });
    req.on("end", () => {
      (req as Request & { rawBody?: string }).rawBody = raw;
      try {
        if (raw && raw.trim().startsWith("{")) {
          req.body = JSON.parse(raw);
        } else {
          req.body = raw;
        }
      } catch {
        req.body = raw;
      }
      next();
    });
  });

  router.post("/webhook/:user_token", async (req: Request, res: Response) => {
    const tokenParam = req.params.user_token;
    const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
    if (!token || token.length < 16) {
      res.status(400).json({ error: "invalid token" });
      return;
    }

    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";

    if (opts.sharedSecret) {
      const sig = req.header("x-tradestack-signature");
      if (!verifyHmac(rawBody, sig, opts.sharedSecret)) {
        log.warn("webhook hmac failed", { token: token.slice(0, 6) + "..." });
        res.status(401).json({ error: "hmac verification failed" });
        return;
      }
    }

    const userId = await opts.backend.userIdByWebhookToken(token);
    if (!userId) {
      log.warn("webhook token not found", { token: token.slice(0, 6) + "..." });
      res.status(404).json({ error: "unknown token" });
      return;
    }

    const { symbol, payload } = parseAlert(req.body, rawBody);
    const inserted = await opts.backend.alertInsert(userId, {
      source: "tradingview_webhook",
      symbol,
      payload,
    });

    res.status(202).json({ id: inserted.id, accepted: true });
  });

  return router;
}
