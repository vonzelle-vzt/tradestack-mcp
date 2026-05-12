import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  userId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function currentUserId(): string {
  const ctx = storage.getStore();
  return ctx?.userId ?? process.env.TRADESTACK_USER_ID?.trim() ?? "local";
}
