import { describe, expect, it } from "vitest";
import { classifySwingStrength } from "./swing-strength";
import type { SwingPriceAction } from "./swing-price-action";
import type { SwingSweep } from "./swing-sweep";

const strongPa: SwingPriceAction = { pattern: "pin", reacted: true, control: "sellers", text: "Pin", held: true, settled: true, reversalShare: 80 };
const nonePa: SwingPriceAction = { pattern: "none", reacted: false, control: "balanced", text: "No", settled: true };
describe("swing strength", () => {
  it("strong price action = Strong exit", () => expect(classifySwingStrength(strongPa, null).strength).toBe("strong"));
  it("strong sweep alone = Strong exit", () => {
    const sw = { status: "confirmed", level: 1, text: "s", strong: true, held: true } as SwingSweep;
    expect(classifySwingStrength(nonePa, sw).strength).toBe("strong");
  });
  it("settled with nothing = Weak hold", () => expect(classifySwingStrength(nonePa, { status: "none", level: null, text: "" }).strength).toBe("weak"));
  it("unsettled = no tag yet", () => expect(classifySwingStrength({ ...nonePa, settled: false }, null).strength).toBe("pending"));
});
