import { describe, it } from "node:test";
import type { OhlcvBar } from "@/lib/chart/indicators";
import { expect } from "../../lib/chart/test-expect";
import { buildIndicatorSeries } from "./indicator-specs";

const bar = (index: number, high: number, low: number, close = 100): OhlcvBar => ({
  time: index * 60,
  open: close,
  high,
  low,
  close,
  volume: 1,
});

describe("Support & Resistance", () => {
  it("uses confirmed 10-bar pivots and removes levels after a close-through", () => {
    const bars = Array.from({ length: 35 }, (_, i) => bar(i, 105, 95));
    bars[10] = bar(10, 120, 94);
    bars[12] = bar(12, 106, 80);
    bars[20] = bar(20, 106, 96, 100);
    bars[22] = bar(22, 106, 96, 100);

    const [resistance, support] = buildIndicatorSeries("sr").compute(bars);
    expect(Number.isNaN(resistance[19])).toBe(true);
    expect(resistance[20]).toBe(120);
    expect(Number.isNaN(support[21])).toBe(true);
    expect(support[22]).toBe(80);

    bars[24] = bar(24, 123, 99, 121);
    bars[26] = bar(26, 101, 78, 79);
    const [afterBreakResistance, afterBreakSupport] = buildIndicatorSeries("sr").compute(bars);
    expect(Number.isNaN(afterBreakResistance[24])).toBe(true);
    expect(Number.isNaN(afterBreakResistance[25])).toBe(true);
    expect(Number.isNaN(afterBreakSupport[26])).toBe(true);
  });
});