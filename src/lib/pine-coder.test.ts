import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { lintScript, outlineScript, STARTER_MQL5, STARTER_PINE } from "./pine-coder";

describe("lintScript", () => {
  it("starter files have no errors", () => {
    expect(lintScript(STARTER_PINE, "pine").filter((p) => p.level === "error")).toEqual([]);
    expect(lintScript(STARTER_MQL5, "mql5").filter((p) => p.level === "error")).toEqual([]);
  });
  it("reports an unclosed bracket on its line", () => {
    const p = lintScript('//@version=6\nindicator("x")\nplot(close', "pine");
    expect(p.some((x) => x.line === 3 && x.level === "error" && x.message === '"(" is never closed')).toBe(true);
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
    const first = outlineScript(STARTER_PINE, "pine")[0];
    expect(first.kind).toBe("input");
    expect(first.name).toBe("len");
    expect(outlineScript(STARTER_MQL5, "mql5").some((o) => o.name === "OnTick")).toBe(true);
  });
});
