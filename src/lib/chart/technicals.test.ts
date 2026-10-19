import { describe, it } from "node:test";
import type { OhlcvBar } from "./indicators";
import { ratingFor, technicalSummary } from "./technicals";
import { expect } from "./test-expect";

const series = (closes: number[]): OhlcvBar[] =>
  closes.map((c, i) => ({ time: i * 60, open: c, high: c + 1, low: c - 1, close: c, volume: 0 }));

describe("technical summary", () => {
  it("needs at least 30 candles", () => {
    expect(technicalSummary(series(Array.from({ length: 29 }, (_, i) => 100 + i)))).toBeNull();
  });

  it("price above every average reads as buy on moving averages", () => {
    const s = technicalSummary(series(Array.from({ length: 250 }, (_, i) => 100 + i)))!;
    expect(s.movingAverages.every((m) => m.verdict === "buy")).toBe(true);
  });

  it("price below every average reads as sell on moving averages", () => {
    const s = technicalSummary(series(Array.from({ length: 250 }, (_, i) => 400 - i)))!;
    expect(s.movingAverages.every((m) => m.verdict === "sell")).toBe(true);
  });

  it("rating cut points", () => {
    expect(ratingFor(0.5)).toBe("Strong buy");
    expect(ratingFor(0.2)).toBe("Buy");
    expect(ratingFor(0)).toBe("Neutral");
    expect(ratingFor(-0.2)).toBe("Sell");
    expect(ratingFor(-0.5)).toBe("Strong sell");
  });
});
