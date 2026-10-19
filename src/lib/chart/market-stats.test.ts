import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { performance, ratingFor, rsi, technicals } from "./market-stats";
import type { OhlcvBar } from "./indicators";

const bar = (time: number, close: number): OhlcvBar => ({ time, open: close, high: close, low: close, close, volume: 1 });

describe("terminal market stats", () => {
  it("measures performance from the close at the look-back time", () => {
    const bars = Array.from({ length: 25 }, (_, i) => bar(i * 3600, 100 + i));
    const perf = performance(bars, 3600);
    // 1H window is skipped on a 1H chart (shorter than two candles).
    expect(perf.map((p) => p.label)).toEqual(["4H", "1D"]);
    expect(perf[1].pct).toBeCloseTo(((124 - 100) / 100) * 100);
  });

  it("skips windows the loaded candles do not reach", () => {
    const bars = Array.from({ length: 10 }, (_, i) => bar(i * 900, 100));
    expect(performance(bars, 900).map((p) => p.label)).toEqual(["1H"]);
  });

  it("maps scores to the five ratings", () => {
    expect(ratingFor(-1)).toBe("Strong sell");
    expect(ratingFor(-0.25)).toBe("Sell");
    expect(ratingFor(0)).toBe("Neutral");
    expect(ratingFor(0.5)).toBe("Buy");
    expect(ratingFor(1)).toBe("Strong buy");
  });

  it("reads a steady uptrend with bullish structure as strong buy", () => {
    const bars = Array.from({ length: 60 }, (_, i) => bar(i * 60, 100 + i));
    expect(rsi(bars.map((b) => b.close))).toBe(100);
    expect(technicals(bars, "bullish").rating).toBe("Strong buy");
  });
});
