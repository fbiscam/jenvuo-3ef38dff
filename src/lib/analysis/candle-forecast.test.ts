import { describe, expect, it } from "vitest";

import {
  build15mCandleForecast,
  FIFTEEN_MINUTES_MS,
  get15mBoundary,
} from "@/lib/analysis/candle-forecast";
import type { Candle } from "@/lib/analysis/engine";

const NOW = Date.UTC(2026, 8, 18, 14, 46, 18);

function candles(count: number, step: number, bodyDirection: 1 | -1, end = NOW): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const open = 2_600 + index * step;
    const close = open + bodyDirection * (0.7 + (index % 4) * 0.08);
    return {
      t: end - (count - index + 2) * FIFTEEN_MINUTES_MS,
      o: open,
      h: Math.max(open, close) + 0.3,
      l: Math.min(open, close) - 0.2,
      c: close,
      v: 100 + index,
    };
  });
}

describe("15m candle forecast", () => {
  it("aligns the countdown to the next UTC 15-minute boundary", () => {
    expect(get15mBoundary(NOW)).toEqual({
      currentOpenMs: Date.UTC(2026, 8, 18, 14, 45, 0),
      currentCloseMs: Date.UTC(2026, 8, 18, 15, 0, 0),
      remainingMs: 13 * 60_000 + 42_000,
    });
  });

  it("produces calibrated bullish and bearish forecasts without exceeding the confidence cap", () => {
    const bullish = build15mCandleForecast(candles(340, 0.35, 1), candles(340, 0.9, 1), NOW);
    const bearish = build15mCandleForecast(candles(340, -0.35, -1), candles(340, -0.9, -1), NOW);
    expect(bullish.direction).toBe("BULLISH");
    expect(bearish.direction).toBe("BEARISH");
    expect(bullish.confidence).toBeLessThanOrEqual(85);
    expect(bearish.confidence).toBeLessThanOrEqual(85);
    expect(bullish.calibration.tested).toBeGreaterThanOrEqual(12);
  });

  it("returns indecisive for stale candles", () => {
    const staleEnd = NOW - 2 * 60 * 60_000;
    const result = build15mCandleForecast(
      candles(100, 0.2, 1, staleEnd),
      candles(100, 0.4, 1, staleEnd),
      NOW,
    );
    expect(result.direction).toBe("INDECISIVE");
    expect(result.stale).toBe(true);
    expect(result.confidence).toBe(0);
  });
});