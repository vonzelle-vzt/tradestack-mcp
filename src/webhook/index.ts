/**
 * Webhook ingress — placeholder.
 *
 * Roadmap: an Express/Hono microserver under MCP_HTTP_PORT that accepts
 * TradingView alert POSTs at /webhook/:user_token and:
 *   1. Verifies WEBHOOK_SHARED_SECRET (HMAC)
 *   2. Parses the alert payload (TV's pipe-delimited convention)
 *   3. Persists into alert_events table
 *   4. Surfaces via the `alerts_recent` MCP tool and SSE stream
 *
 * Until wired, MCP runs over stdio only.
 */
export const PLACEHOLDER = true;
