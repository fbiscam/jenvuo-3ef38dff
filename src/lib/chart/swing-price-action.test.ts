import { describe, it } from "vitest";
import { expect } from "./test-expect";
import { classifySwingPriceAction } from "./swing-price-action";

const bar = (t: number, o: number, h: number, l: number, c: number) => ({ t, o, h, l, c });
const base = Array.from({ length: 15 }, (_, k) => bar(k, 100, 101, 99, 100));

describe("swing price action", () => {
  it("flags a pin rejection at a high with sellers in control", () => {
    const bars = [...base, bar(15, 100, 106, 99.8, 100.2), bar(16, 100.2, 100.4, 98, 98.2)];
    const pa = classifySwingPriceAction(bars, 15, "high", 30);
    expect(pa.pattern).toBe("pin");
    expect(pa.reacted).toBe(true);
    expect(pa.control).toBe("sellers");
  });
  it("flags a bullish engulfing at a low", () => {
    const bars = [...base, bar(15, 100, 100.2, 98, 98.5), bar(16, 98.4, 101, 98.3, 100.6)];
    const pa = classifySwingPriceAction(bars, 15, "low", 70);
    expect(pa.pattern).toBe("engulfing");
    expect(pa.reacted).toBe(true);
  });
  it("waits when no candle has closed after the swing", () => {
    const bars = [...base, bar(15, 100, 102, 99.5, 101.5)];
    expect(classifySwingPriceAction(bars, 15, "high", 50).pattern).toBe("pending");
  });
  it("reports no reaction when price stays balanced", () => {
    const bars = [...base, bar(15, 100, 102, 99.5, 101.5), bar(16, 101.5, 101.8, 100.8, 101.2)];
    const pa = classifySwingPriceAction(bars, 15, "high", 50);
    expect(pa.pattern).toBe("none");
    expect(pa.reacted).toBe(false);
  });
});
