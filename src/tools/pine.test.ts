import { describe, it, expect } from "vitest";
import { pineCompileSchema } from "./pine.js";

describe("pine_compile schema", () => {
  it("requires non-empty source", () => {
    expect(() => pineCompileSchema.parse({ source: "" })).toThrow();
  });

  it("accepts any source string", () => {
    const ok = pineCompileSchema.parse({ source: "//@version=6\nindicator('x')\nplot(close)" });
    expect(ok.source).toMatch(/version=6/);
  });
});
