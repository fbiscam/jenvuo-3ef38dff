import { describe, it } from "node:test";
import { computeLiquidityTracker } from "./liquidity-tracker";
import { expect } from "./test-expect";
import type { OhlcvBar } from "./indicators";

const DAY = 1_700_006_400;

function baseBars(): OhlcvBar[] {
  return Array.from({ length: 64 }, (_, index) => {
    const hour = index / 4;
    const mid = hour < 6 ? 100 + Math.sin(index) : 100;
    return { time: DAY + index * 900, open: mid, high: mid + 1, low: mid - 1, close: mid, volume: 100 };
  });
}

describe("15M session liquidity tracker", () => {
  it("locks the complete Asia high and low", () => {
    const result = computeLiquidityTracker(baseBars());
    expect(result?.levels.some((level) => level.kind === "ASIA_HIGH")).toBe(true);
    expect(result?.levels.some((level) => level.kind === "ASIA_LOW")).toBe(true);
  });

  it("requires a 50% wick and a close back inside the swept level", () => {
    const bars = baseBars();
    const asiaHigh = Math.max(...bars.slice(0, 24).map((bar) => bar.high));
    bars[28] = { ...bars[28], open: asiaHigh - 0.2, high: asiaHigh + 3, low: asiaHigh - 0.4, close: asiaHigh - 0.1, volume: 200 };
    const result = computeLiquidityTracker(bars, { volumeReliable: true });
    expect(result?.sweeps.some((sweep) => sweep.level === "ASIA_HIGH" && sweep.wickRatio >= 0.5)).toBe(true);
  });

  it("does not claim a Gold volume ratio when volume is not reliable", () => {
    const result = computeLiquidityTracker(baseBars(), { volumeReliable: false });
    expect(result?.volumeAvailable).toBe(false);
    expect(result?.volumeSpikeRatio).toBe(null);
  });
});