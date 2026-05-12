import { describe, it, expect, afterEach } from "vitest";
import { currentUserId, runWithContext } from "./context.js";

describe("request context", () => {
  const originalEnv = process.env.TRADESTACK_USER_ID;
  afterEach(() => {
    process.env.TRADESTACK_USER_ID = originalEnv;
  });

  it("defaults to 'local' outside any context", () => {
    delete process.env.TRADESTACK_USER_ID;
    expect(currentUserId()).toBe("local");
  });

  it("honors TRADESTACK_USER_ID env outside context", () => {
    process.env.TRADESTACK_USER_ID = "neil";
    expect(currentUserId()).toBe("neil");
  });

  it("scoped to runWithContext", async () => {
    delete process.env.TRADESTACK_USER_ID;
    const got = await runWithContext({ userId: "u1" }, async () => currentUserId());
    expect(got).toBe("u1");
    expect(currentUserId()).toBe("local");
  });
});
