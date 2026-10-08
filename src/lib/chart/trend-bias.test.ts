import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { computeTrendBias } from "./trend-bias";

const rising = Array.from({ length: 250 }, (_, k) => ({ t: k, c: 100 + k * 0.5 }));
const falling = Array.from({ length: 250 }, (_, k) => ({ t: k, c: 300 - k * 0.5 }));

describe("trend bias", () => {
  it("reads Up on HH + HL, bullish BOS and rising EMAs", () => {
    const tb = computeTrendBias(
      rising,
      [
        { t: 200, price: 200, kind: "high", label: "HH" },
        { t: 220, price: 205, kind: "low", label: "HL" },
      ],
      [{ t: 230, dir: "bullish", type: "BOS" }],
    );
    expect(tb?.direction).toBe("up");
    expect(tb!.strength).toBe(100);
  });
  it("reads Down on LH + LL and falling EMAs", () => {
    const tb = computeTrendBias(
      falling,
      [
        { t: 200, price: 200, kind: "high", label: "LH" },
        { t: 220, price: 195, kind: "low", label: "LL" },
      ],
      [{ t: 230, dir: "bearish", type: "BOS" }],
    );
    expect(tb?.direction).toBe("down");
  });
  it("reads Sideways when votes disagree", () => {
    const flat = Array.from({ length: 150 }, (_, k) => ({ t: k, c: 100 + (k % 2 ? -0.1 : 0.1) }));
    const tb = computeTrendBias(
      flat,
      [
        { t: 120, price: 99, kind: "low", label: "HL" },
        { t: 130, price: 101, kind: "high", label: "LH" },
      ],
      [{ t: 230, dir: "bullish", type: "CHOCH" }],
    );
    expect(tb?.direction).toBe("sideways");
  });
  it("needs enough closed candles", () => {
    expect(computeTrendBias(rising.slice(0, 10), [], [])).toBe(null);
  });
});
