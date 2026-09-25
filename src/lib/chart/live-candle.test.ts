import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { buildLiveBars } from "./live-candle";
import type { OhlcvBar } from "./indicators";

const bars: OhlcvBar[] = Array.from({ length: 24 }, (_, index) => ({
  time: 1_700_000_000 + index * 1800,
  open: 4260 + index * 0.1,
  high: 4262 + index * 0.1,
  low: 4258 + index * 0.1,
  close: 4261 + index * 0.1,
  volume: 100,
}));

describe("live candle normalization", () => {
  it("updates a valid active candle without changing its open", () => {
    const result = buildLiveBars(bars, 4265, bars.at(-1)?.time ?? 0);
    expect(result.at(-1)?.open).toBe(bars.at(-1)?.open);
    expect(result.at(-1)?.close).toBe(4265);
    expect(result.at(-1)?.high).toBe(4265);
  });

  it("rejects a mismatched quote that would create a full-height candle", () => {
    const result = buildLiveBars(bars, 2600, bars.at(-1)?.time ?? 0);
    expect(result.at(-1)?.close).toBe(bars.at(-1)?.close);
    expect(result.at(-1)?.low).toBe(bars.at(-1)?.low);
  });

  it("drops malformed OHLC rows before rendering", () => {
    const malformed = { ...bars[5], high: bars[5].low - 10 };
    const result = buildLiveBars([...bars, malformed], null, bars.at(-1)?.time ?? 0);
    expect(result.some((bar) => bar.high < bar.low)).toBe(false);
  });
});