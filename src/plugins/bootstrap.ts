import { registerDataFeed, registerCodegen, registerBroker } from "./registry.js";
import { createPolygonPlugin } from "./datafeed/polygon.js";
import { createAlpacaPlugin } from "./datafeed/alpaca.js";
import { createPineToNt8Plugin } from "./codegen/pine-to-nt8.js";
import { createAlpacaBroker } from "./broker/alpaca.js";
import { createTradeLockerBroker } from "./broker/tradelocker.js";
import { createMetaApiBroker } from "./broker/metaapi.js";
import { createNinjaTraderAtiBroker } from "./broker/ninjatrader-ati.js";
import { createCTraderBroker } from "./broker/ctrader.js";
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

  // Reference codegen plugin is always available — pure local transformation.
  registerCodegen(createPineToNt8Plugin());

  // ─── Broker adapters (each opt-in via env) ───
  if (alpacaKey && alpacaSecret) {
    registerBroker(createAlpacaBroker(alpacaKey, alpacaSecret, process.env.ALPACA_PAPER !== "false"));
    log.info("plugin loaded: alpaca broker");
  }

  if (
    process.env.TRADELOCKER_EMAIL &&
    process.env.TRADELOCKER_PASSWORD &&
    process.env.TRADELOCKER_SERVER &&
    process.env.TRADELOCKER_ACCOUNT_ID
  ) {
    registerBroker(
      createTradeLockerBroker({
        baseUrl: process.env.TRADELOCKER_BASE_URL?.trim() ?? "https://live.tradelocker.com/backend-api",
        email: process.env.TRADELOCKER_EMAIL,
        password: process.env.TRADELOCKER_PASSWORD,
        server: process.env.TRADELOCKER_SERVER,
        accountId: process.env.TRADELOCKER_ACCOUNT_ID,
      }),
    );
    log.info("plugin loaded: tradelocker broker (alpha)");
  }

  if (process.env.METAAPI_TOKEN && process.env.METAAPI_ACCOUNT_ID) {
    registerBroker(createMetaApiBroker(process.env.METAAPI_TOKEN, process.env.METAAPI_ACCOUNT_ID));
    log.info("plugin loaded: metaapi broker (alpha)");
  }

  if (process.env.NT8_ATI_PATH) {
    registerBroker(createNinjaTraderAtiBroker(process.env.NT8_ATI_PATH));
    log.info("plugin loaded: ninjatrader-ati broker (alpha)");
  }

  if (process.env.CTRADER_CLIENT_ID && process.env.CTRADER_CLIENT_SECRET) {
    registerBroker(createCTraderBroker(process.env.CTRADER_CLIENT_ID, process.env.CTRADER_CLIENT_SECRET));
    log.info("plugin loaded: ctrader broker (stub — see docs/platforms/ctrader.md)");
  }
}
