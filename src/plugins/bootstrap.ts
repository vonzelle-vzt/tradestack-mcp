import { registerDataFeed } from "./registry.js";
import { createPolygonPlugin } from "./datafeed/polygon.js";
import { createAlpacaPlugin } from "./datafeed/alpaca.js";
import { log } from "../lib/logger.js";

/**
 * Load env-gated plugins at startup. Each plugin is opt-in: if the
 * required env vars are absent, the plugin is silently skipped so the
 * zero-config `npx -y tradestack-mcp` path keeps working.
 */
export function loadEnvPlugins(): void {
  const polygonKey = process.env.POLYGON_API_KEY?.trim();
  if (polygonKey) {
    registerDataFeed(createPolygonPlugin(polygonKey));
    log.info("plugin loaded: polygon");
  }

  const alpacaKey = process.env.ALPACA_KEY_ID?.trim();
  const alpacaSecret = process.env.ALPACA_SECRET_KEY?.trim();
  if (alpacaKey && alpacaSecret) {
    registerDataFeed(createAlpacaPlugin(alpacaKey, alpacaSecret));
    log.info("plugin loaded: alpaca");
  }
}
