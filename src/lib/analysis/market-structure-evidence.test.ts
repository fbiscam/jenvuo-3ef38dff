import { describe, expect, test } from "bun:test";

import {
  detectMarketStructureEvidence,
  mapMarketStructure,
  type MarketStructureCandle,
} from "./market-structure-evidence";

function candles(highs: number[], lows: number[], closes?: number[]): MarketStructureCandle[] {
  return highs.map((high, index) => {
    const low = lows[index];
    const close = closes?.[index] ?? (high + low) / 2;
    return {
      timestamp: Date.UTC(2026, 0, 1, 0, index * 30),
      open: close,
      high,
      low,
      close,
    };
  });
}

describe("mapMarketStructure", () => {
  test("labels confirmed HH/LH and HL/LL pivots from strict five-candle fractals", () => {
    const input = candles(
      [10, 11, 15, 12, 11, 13, 16, 14, 12, 13, 14, 12, 11],
      [8, 9, 10, 8, 5, 7, 9, 8, 6, 7, 8, 6, 4],
    );
    const mapped = mapMarketStructure(input);

    expect(mapped[2].is_swing_high).toBe(true);
    expect(mapped[2].structure_label).toBeNull();
    expect(mapped[4].is_swing_low).toBe(true);
    expect(mapped[4].structure_label).toBeNull();
    expect(mapped[6].structure_label).toBe("HH");
    expect(mapped[8].structure_label).toBe("HL");
    expect(mapped[10].structure_label).toBe("LH");
    expect(mapped[12].structure_label).toBeNull();
  });

  test("does not confirm a swing before the right-side candles close", () => {
    const input = candles([10, 11, 15, 12, 11], [8, 9, 10, 8, 7]);

    expect(mapMarketStructure(input.slice(0, 4)).some((candle) => candle.is_swing_high)).toBe(false);
    expect(mapMarketStructure(input).at(2)?.is_swing_high).toBe(true);
  });

  test("requires a strict pivot and rejects equal-high plateaus", () => {
    const input = candles([10, 11, 15, 15, 11, 10], [8, 9, 10, 10, 8, 7]);
    expect(mapMarketStructure(input).some((candle) => candle.is_swing_high)).toBe(false);
  });

  test("places break events only on close-through candles", () => {
    const input = candles(
      [10, 11, 15, 12, 11, 12, 14, 16, 14, 12, 11, 10, 9],
      [8, 9, 10, 8, 6, 7, 9, 11, 9, 7, 5, 4, 3],
      [9, 10, 12, 10, 8, 10, 13, 15.5, 11, 8, 5.5, 5, 4],
    );
    const mapped = mapMarketStructure(input);
    const evidence = detectMarketStructureEvidence(
      input.map((candle) => ({
        t: candle.timestamp,
        o: candle.open,
        h: candle.high,
        l: candle.low,
        c: candle.close,
      })),
    );

    for (const event of evidence.breaks) {
      expect(mapped[event.index].smc_event).toBe(event.type === "CHOCH" ? "CHoCH" : "BOS");
    }
    expect(mapped.filter((candle) => candle.smc_event).length).toBe(evidence.breaks.length);
  });

  test("rejects malformed OHLC instead of silently shifting indexes", () => {
    const input = candles([10, 11, 12], [8, 9, 10]);
    input[1].high = 7;
    expect(() => mapMarketStructure(input)).toThrow("Invalid OHLC candle at index 1");
  });
});