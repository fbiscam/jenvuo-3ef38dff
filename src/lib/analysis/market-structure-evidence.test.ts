import { describe, expect, it } from "vitest";
import { detectMarketStructureEvidence, type StructureCandle } from "./market-structure-evidence";

function candles(closes: number[]): StructureCandle[] {
  return closes.map((close, index) => ({
    t: index * 60_000,
    o: index ? closes[index - 1] : close,
    h: close + 1,
    l: close - 1,
    c: close,
  }));
}

describe("detectMarketStructureEvidence", () => {
  it("does not use an unconfirmed pivot or label the first break BOS", () => {
    const result = detectMarketStructureEvidence(candles([100, 102, 105, 103, 101, 104, 107, 109, 108]));
    expect(result.breaks[0]?.type).toBe("MSS");
    expect(result.breaks[0]?.dir).toBe("bullish");
  });

  it("labels the first opposite close-through as CHOCH", () => {
    const result = detectMarketStructureEvidence(
      candles([100, 103, 106, 103, 99, 103, 108, 104, 101, 97, 100]),
    );
    expect(result.breaks.some((event) => event.type === "CHOCH" && event.dir === "bearish")).toBe(true);
  });

  it("rejects malformed candles instead of producing false evidence", () => {
    const result = detectMarketStructureEvidence([
      ...candles([100, 101, 102]),
      { t: 4, o: 100, h: 90, l: 110, c: 100 },
    ]);
    expect(result.breaks).toHaveLength(0);
    expect(result.trend).toBe("undecided");
  });
});