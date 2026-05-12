import { describe, it, expect } from "vitest";
import { screenerQuerySchema } from "./screener.js";

describe("screener schema", () => {
  it("accepts minimal valid input", () => {
    const parsed = screenerQuerySchema.parse({});
    expect(parsed.market).toBe("america");
    expect(parsed.range).toEqual([0, 50]);
  });

  it("rejects unknown market", () => {
    expect(() => screenerQuerySchema.parse({ market: "mars" })).toThrow();
  });

  it("rejects range over 200", () => {
    expect(() => screenerQuerySchema.parse({ range: [0, 500] })).toThrow();
  });

  it("accepts crosses_above operator", () => {
    const parsed = screenerQuerySchema.parse({
      filters: [{ left: "MA50", operation: "crosses_above", right: "MA200" }],
    });
    expect(parsed.filters[0]?.operation).toBe("crosses_above");
  });
});
