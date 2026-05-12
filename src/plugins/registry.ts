import type { Plugin, BrokerPlugin, CodegenPlugin, ScannerPlugin, DataFeedPlugin } from "./types.js";
import { log } from "../lib/logger.js";

const plugins = new Map<string, Plugin>();

export function registerPlugin(p: Plugin): void {
  if (plugins.has(p.name)) {
    log.warn("plugin already registered, overwriting", { name: p.name });
  }
  plugins.set(p.name, p);
  log.info("plugin registered", { name: p.name, kind: p.kind });
}

export function getPlugin<T extends Plugin>(name: string): T | undefined {
  return plugins.get(name) as T | undefined;
}

export function listPlugins(kind?: Plugin["kind"]): Plugin[] {
  const all = Array.from(plugins.values());
  return kind ? all.filter((p) => p.kind === kind) : all;
}

export const registerBroker = (p: BrokerPlugin): void => registerPlugin(p);
export const registerCodegen = (p: CodegenPlugin): void => registerPlugin(p);
export const registerScanner = (p: ScannerPlugin): void => registerPlugin(p);
export const registerDataFeed = (p: DataFeedPlugin): void => registerPlugin(p);
