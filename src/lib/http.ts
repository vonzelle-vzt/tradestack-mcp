import { request } from "undici";
import { LRUCache } from "lru-cache";
import { log } from "./logger.js";

const cache = new LRUCache<string, unknown>({
  max: 1000,
  ttl: 1000 * 60 * 5,
});

interface FetchOpts {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeoutMs?: number;
  cacheKey?: string;
  cacheTtlMs?: number;
}

export async function httpJson<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  const { method = "GET", headers = {}, body, timeoutMs = 10_000, cacheKey, cacheTtlMs } = opts;

  if (cacheKey) {
    const cached = cache.get(cacheKey) as T | undefined;
    if (cached !== undefined) {
      log.debug("cache hit", { cacheKey });
      return cached;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await request(url, {
      method,
      headers: { "user-agent": "tradestack-mcp/0.1", ...headers },
      body,
      signal: controller.signal,
    });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      const text = await res.body.text();
      throw new Error(`HTTP ${res.statusCode}: ${text.slice(0, 200)}`);
    }
    const data = (await res.body.json()) as T;
    if (cacheKey) cache.set(cacheKey, data, { ttl: cacheTtlMs });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function httpForm(url: string, fields: Record<string, string>, opts: FetchOpts = {}): Promise<unknown> {
  const boundary = "----tradestack" + Math.random().toString(36).slice(2);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`);
  }
  parts.push(`--${boundary}--\r\n`);
  const body = parts.join("");

  return httpJson(url, {
    ...opts,
    method: "POST",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      ...(opts.headers ?? {}),
    },
    body,
  });
}
