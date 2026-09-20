import type { PineCandle } from "./engine";

export type SwingLabel = "HH" | "LH" | "HL" | "LL";

export type SwingPoint = {
  index: number;
  time: number;
  price: number;
  label: SwingLabel;
};

export type StructureEvent = {
  index: number;
  time: number;
  fromTime: number;
  price: number;
  kind: "BOS" | "CHoCH";
  direction: "bullish" | "bearish";
};

export type MarketStructure = {
  swings: SwingPoint[];
  events: StructureEvent[];
};

/**
 * Swing-point + BOS/CHoCH detection used by the built-in "JENVU AI Market
 * Structure" indicator. A swing high/low is a pivot with `size` bars on both
 * sides; breaking the last swing on a candle close is a BOS when it continues
 * the current trend and a CHoCH when it flips it.
 */
export function computeMarketStructure(candles: PineCandle[], size = 8): MarketStructure {
  const swings: SwingPoint[] = [];
  const events: StructureEvent[] = [];
  if (candles.length < size * 2 + 5) return { swings, events };

  let prevHigh: number | null = null;
  let prevLow: number | null = null;
  let lastHigh: { price: number; index: number } | null = null;
  let lastLow: { price: number; index: number } | null = null;
  let trend: "bullish" | "bearish" | null = null;

  for (let i = size; i < candles.length - size; i += 1) {
    const bar = candles[i]!;
    let isHigh = true;
    let isLow = true;
    for (let j = i - size; j <= i + size; j += 1) {
      if (j === i) continue;
      const other = candles[j]!;
      if (other.high >= bar.high) isHigh = false;
      if (other.low <= bar.low) isLow = false;
    }

    if (isHigh) {
      const label: SwingLabel = prevHigh === null || bar.high > prevHigh ? "HH" : "LH";
      swings.push({ index: i, time: bar.time, price: bar.high, label });
      prevHigh = bar.high;
      lastHigh = { price: bar.high, index: i };
    }
    if (isLow) {
      const label: SwingLabel = prevLow === null || bar.low < prevLow ? "HL" : "LL";
      swings.push({ index: i, time: bar.time, price: bar.low, label });
      prevLow = bar.low;
      lastLow = { price: bar.low, index: i };
    }
  }

  // Second pass: walk the bars again and flag the first close that breaks the
  // most recent confirmed swing level.
  prevHigh = null;
  prevLow = null;
  lastHigh = null;
  lastLow = null;
  let swingCursor = 0;

  for (let i = 0; i < candles.length; i += 1) {
    const bar = candles[i]!;

    while (swingCursor < swings.length && swings[swingCursor]!.index <= i - 0) {
      const swing = swings[swingCursor]!;
      if (swing.index + size > i) break;
      if (swing.label === "HH" || swing.label === "LH") {
        lastHigh = { price: swing.price, index: swing.index };
      } else {
        lastLow = { price: swing.price, index: swing.index };
      }
      swingCursor += 1;
    }

    if (lastHigh && bar.close > lastHigh.price) {
      events.push({
        index: i,
        time: bar.time,
        fromTime: candles[lastHigh.index]!.time,
        price: lastHigh.price,
        kind: trend === "bearish" ? "CHoCH" : "BOS",
        direction: "bullish",
      });
      trend = "bullish";
      lastHigh = null;
    } else if (lastLow && bar.close < lastLow.price) {
      events.push({
        index: i,
        time: bar.time,
        fromTime: candles[lastLow.index]!.time,
        price: lastLow.price,
        kind: trend === "bullish" ? "CHoCH" : "BOS",
        direction: "bearish",
      });
      trend = "bearish";
      lastLow = null;
    }
  }

  return { swings, events };
}
