import type { BrokerPlugin, BrokerOrder } from "../types.js";

/**
 * cTrader Open API adapter. Status: stub — the real Open API uses Protocol
 * Buffers over TCP/TLS (ports 5035/5036) and requires a sustained socket
 * connection with heartbeat. That's a meaningful subsystem; this stub
 * documents the surface and fails loudly at call-time so consumers know
 * what's wired and what isn't.
 *
 * Path to production wiring:
 *  1. Add `@reiryoku/ctrader-layer` or the spotware openapi-py JS port
 *  2. Maintain a long-lived ProtoConnection per account
 *  3. Map BrokerOrder → ProtoOANewOrderReq
 *  4. Map ProtoOAExecutionEvent back to status strings
 *
 * Reference: https://openapi.ctrader.com/
 */
export function createCTraderBroker(_clientId: string, _clientSecret: string): BrokerPlugin {
  const stub = async (): Promise<never> => {
    throw new Error(
      "cTrader broker plugin is stubbed in v0.7 — Open API requires a Protobuf TCP connection. " +
        "Implement the full handshake in a downstream package or contribute to docs/platforms/ctrader.md.",
    );
  };
  return {
    name: "ctrader",
    kind: "broker",
    capabilities: ["forex", "crypto", "stocks"],
    async place_order(_o: BrokerOrder) {
      await stub();
      return { id: "", status: "" };
    },
    async cancel_order(_id: string) {
      await stub();
      return { ok: false };
    },
    async positions() {
      await stub();
      return [];
    },
    async account() {
      await stub();
      return { equity: 0, cash: 0, buying_power: 0 };
    },
  };
}
