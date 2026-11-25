import { describe, expect, it } from "vitest";
import { eurNeedsFuturesOhlc, shiftFuturesToSpot } from "./gold-analysis.functions";

const c = (t: number, o: number, h: number, l: number, cl: number) => ({ t, o, h, l, c: cl, v: 1 });

describe("EUR/USD short-timeframe candles", () => {
  it("flags flat sampled spot rows", () => {
    expect(eurNeedsFuturesOhlc(Array.from({ length: 40 }, (_, i) => c(i, 1.1, 1.1, 1.1, 1.1)))).toBe(true);
  });
  it("shifts futures onto the spot level and keeps newer live spot rows", () => {
    const spot = [c(1, 1.1, 1.1, 1.1, 1.1), c(2, 1.1001, 1.1001, 1.1001, 1.1001), c(3, 1.1002, 1.1002, 1.1002, 1.1002)];
    const fut = [c(1, 1.1003, 1.1008, 1.0999, 1.1005), c(2, 1.1005, 1.1009, 1.1004, 1.1006)];
    const out = shiftFuturesToSpot(fut, spot);
    expect(out[0]!.c).toBeCloseTo(1.1, 5);
    expect(out[0]!.h).toBeCloseTo(1.1003, 5);
    expect(out.length).toBe(3);
    expect(out[2]!.t).toBe(3);
  });
});
