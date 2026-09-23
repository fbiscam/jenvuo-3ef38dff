import { describe, it } from "node:test";
import { expect } from "./test-expect";
import type { OhlcvBar } from "./indicators";
import { projectNextCandles } from "./projection";

const bars = Array.from({ length: 40 }, (_, index): OhlcvBar => ({
  time: 1_700_000_000 + index * 1800,
  open: 100 + index * 0.2,
  high: 101 + index * 0.2,
  low: 99 + index * 0.2,
  close: 100.2 + index * 0.2,
  volume: 100,
}));

describe("next candle projection", () => {
  it("returns four future scenario candles capped by liquidity", () => {
    const cap = bars.at(-1)?.close ?? 108;
    const result = projectNextCandles(bars, 1800, "bullish", [cap + 0.4], [], 4);
    expect(result?.candles.length).toBe(4);
    expect(result?.candles.every((candle) => candle.close <= cap + 0.4)).toBe(true);
  });

  it("recognizes a confirmed bearish rejection at an upper extreme", () => {
    const input = bars.map((bar) => ({ ...bar }));
    const previous = input[input.length - 2];
    input[input.length - 1] = {
      ...input[input.length - 1],
      open: previous.close + 0.5,
      high: previous.close + 2,
      low: previous.close + 0.1,
      close: previous.close + 0.2,
    };
    const extreme = input.at(-1)?.high ?? 110;
    const result = projectNextCandles(input, 1800, "neutral", [extreme], [], 4);
    expect(result?.extremeReaction).toBe(true);
    expect(result?.bias).toBe("bearish");
  });

  it("does not counter-trend from proximity without a rejection candle", () => {
    const extreme = bars.at(-1)?.high ?? 110;
    const result = projectNextCandles(bars, 1800, "bullish", [extreme], [], 4);
    expect(result?.extremeReaction).toBe(false);
    expect(result?.bias).toBe("bullish");
  });
});