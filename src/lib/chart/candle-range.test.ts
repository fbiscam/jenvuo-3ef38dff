import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { computeCandleRanges } from "./candle-range";
import type { OhlcvBar } from "./indicators";

const trend = (n: number, step: number): OhlcvBar[] =>
  Array.from({ length: n }, (_, k) => {
    const open = 2000 + k * step;
    const close = open + step * 0.8;
    return { time: k * 3600, open, high: Math.max(open, close) + 1, low: Math.min(open, close) - 1, close, volume: 0 };
  });

describe("candle range", () => {
  it("returns the forming candle plus previous 5", () => {
    const r = computeCandleRanges(trend(120, 2));
    expect(r.plans.length).toBe(6);
    expect(r.plans.at(-1)!.index).toBe(119);
  });
  it("gives a bullish plan with TP above and SL below the open in an uptrend", () => {
    const p = computeCandleRanges(trend(120, 2)).plans.at(-1)!;
    expect(p.bias).toBe("bullish");
    expect(p.tp! > p.open).toBe(true);
    expect(p.sl! < p.open).toBe(true);
  });
  it("never changes a past plan when later candles arrive", () => {
    const bars = trend(130, 2);
    const early = computeCandleRanges(bars.slice(0, 121)).plans.find((p) => p.index === 117)!;
    const later = computeCandleRanges(bars.slice(0, 122)).plans.find((p) => p.index === 117)!;
    expect(later.tp).toBe(early.tp);
    expect(later.sl).toBe(early.sl);
    expect(later.expHigh).toBe(early.expHigh);
  });
  it("has no plans with too little history", () => {
    expect(computeCandleRanges(trend(30, 2)).plans.length).toBe(0);
  });
});
