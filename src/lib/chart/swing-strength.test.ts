import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifySwingStrength } from "./swing-strength";
import type { SwingPriceAction } from "./swing-price-action";
import type { SwingSweep } from "./swing-sweep";

const strongPa: SwingPriceAction = { pattern: "pin", reacted: true, control: "sellers", text: "Pin", held: true, settled: true, reversalShare: 80 };
const nonePa: SwingPriceAction = { pattern: "none", reacted: false, control: "balanced", text: "No", settled: true };
describe("swing strength", () => {
  it("strong price action = Strong exit", () => assert.equal(classifySwingStrength(strongPa, null).strength, "strong"));
  it("strong sweep alone = Strong exit", () => {
    const sw = { status: "confirmed", level: 1, text: "s", strong: true, held: true } as SwingSweep;
    assert.equal(classifySwingStrength(nonePa, sw).strength, "strong");
  });
  it("settled with nothing = Weak hold", () => assert.equal(classifySwingStrength(nonePa, { status: "none", level: null, text: "" }).strength, "weak"));
  it("unsettled = no tag yet", () => assert.equal(classifySwingStrength({ ...nonePa, settled: false }, null).strength, "pending"));
});
