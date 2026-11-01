import { describe, expect, it } from "vitest";
import { lintScript, outlineScript, STARTER_MQL5, STARTER_PINE } from "./pine-coder";

describe("lintScript", () => {
  it("starter files have no errors", () => {
    expect(lintScript(STARTER_PINE, "pine").filter((p) => p.level === "error")).toEqual([]);
    expect(lintScript(STARTER_MQL5, "mql5").filter((p) => p.level === "error")).toEqual([]);
  });
  it("reports an unclosed bracket on its line", () => {
    const p = lintScript('//@version=6\nindicator("x")\nplot(close', "pine");
    expect(p).toContainEqual({ line: 3, level: "error", message: '"(" is never closed' });
  });
  it("ignores brackets inside strings and comments", () => {
    expect(lintScript('//@version=6\nindicator("a (")\n// )', "pine")).toEqual([]);
  });
  it("warns when an MQL5 order has no stop loss", () => {
    const code = "void OnTick(){\n trade.Buy(0.1, _Symbol);\n}";
    expect(lintScript(code, "mql5").some((p) => p.line === 2 && p.message.includes("stop loss"))).toBe(true);
  });
});

describe("outlineScript", () => {
  it("lists Pine inputs and MQL5 functions", () => {
    expect(outlineScript(STARTER_PINE, "pine")[0]).toMatchObject({ kind: "input", name: "len" });
    expect(outlineScript(STARTER_MQL5, "mql5").map((o) => o.name)).toContain("OnTick");
  });
});
