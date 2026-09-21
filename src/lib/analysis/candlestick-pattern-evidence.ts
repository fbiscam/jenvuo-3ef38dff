import type { StructureCandle } from "@/lib/analysis/market-structure-evidence";

export type CandlestickPattern = {
  index: number;
  t: number;
  name: string;
  bias: "bullish" | "bearish" | "neutral";
  strength: "strong" | "moderate" | "weak";
  confirmation: string;
};

export type CandlestickPatternEvidence = {
  patterns: CandlestickPattern[];
  latest: CandlestickPattern[];
};

const EPSILON = 1e-9;

function range(candle: StructureCandle): number {
  return Math.max(candle.h - candle.l, EPSILON);
}

function body(candle: StructureCandle): number {
  return Math.abs(candle.c - candle.o);
}

function upperWick(candle: StructureCandle): number {
  return candle.h - Math.max(candle.o, candle.c);
}

function lowerWick(candle: StructureCandle): number {
  return Math.min(candle.o, candle.c) - candle.l;
}

function bullish(candle: StructureCandle): boolean {
  return candle.c > candle.o;
}

function bearish(candle: StructureCandle): boolean {
  return candle.c < candle.o;
}

function midpoint(candle: StructureCandle): number {
  return (candle.o + candle.c) / 2;
}

function localDirection(candles: StructureCandle[], index: number): "up" | "down" | "flat" {
  const start = Math.max(0, index - 5);
  const sample = candles.slice(start, index);
  if (sample.length < 3) return "flat";
  const first = sample[0];
  const last = sample.at(-1);
  if (!first || !last) return "flat";
  const move = last.c - first.c;
  const averageRange = sample.reduce((sum, candle) => sum + range(candle), 0) / sample.length;
  if (move > averageRange * 0.75) return "up";
  if (move < -averageRange * 0.75) return "down";
  return "flat";
}

function addPattern(
  patterns: CandlestickPattern[],
  candle: StructureCandle,
  index: number,
  name: string,
  bias: CandlestickPattern["bias"],
  strength: CandlestickPattern["strength"],
  confirmation: string,
) {
  patterns.push({ index, t: candle.t, name, bias, strength, confirmation });
}

/**
 * Detects objective candle formations from closed OHLC candles. Reversal names
 * are assigned only when their required preceding direction is present.
 */
export function detectCandlestickPatterns(input: StructureCandle[]): CandlestickPatternEvidence {
  const candles = input.filter(
    (candle) =>
      Number.isFinite(candle.t) &&
      Number.isFinite(candle.o) &&
      Number.isFinite(candle.h) &&
      Number.isFinite(candle.l) &&
      Number.isFinite(candle.c) &&
      candle.h >= Math.max(candle.o, candle.c) &&
      candle.l <= Math.min(candle.o, candle.c),
  );
  const patterns: CandlestickPattern[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const candleRange = range(candle);
    const candleBody = body(candle);
    const bodyRatio = candleBody / candleRange;
    const upWick = upperWick(candle);
    const downWick = lowerWick(candle);
    const direction = localDirection(candles, i);

    if (bodyRatio <= 0.1) {
      addPattern(
        patterns,
        candle,
        i,
        upWick >= candleRange * 0.4 && downWick >= candleRange * 0.4 ? "Long-legged doji" : "Doji",
        "neutral",
        "weak",
        "Indecision only; require a later close beyond this candle's high or low.",
      );
    }

    if (downWick >= Math.max(candleBody * 2, candleRange * 0.55) && upWick <= candleRange * 0.2) {
      const isHammer = direction === "down";
      addPattern(
        patterns,
        candle,
        i,
        isHammer ? "Hammer" : direction === "up" ? "Hanging man" : "Long lower-wick rejection",
        isHammer ? "bullish" : direction === "up" ? "bearish" : "neutral",
        bodyRatio >= 0.2 ? "moderate" : "weak",
        isHammer
          ? "Needs a later close above its high."
          : direction === "up"
            ? "Needs a later close below its low."
            : "Context is ranging; wait for a range break.",
      );
    }

    if (upWick >= Math.max(candleBody * 2, candleRange * 0.55) && downWick <= candleRange * 0.2) {
      const isShootingStar = direction === "up";
      addPattern(
        patterns,
        candle,
        i,
        isShootingStar
          ? "Shooting star"
          : direction === "down"
            ? "Inverted hammer"
            : "Long upper-wick rejection",
        isShootingStar ? "bearish" : direction === "down" ? "bullish" : "neutral",
        bodyRatio >= 0.2 ? "moderate" : "weak",
        isShootingStar
          ? "Needs a later close below its low."
          : direction === "down"
            ? "Needs a later close above its high."
            : "Context is ranging; wait for a range break.",
      );
    }

    if (i < 1) continue;
    const previous = candles[i - 1];
    const engulfsBody =
      Math.min(candle.o, candle.c) <= Math.min(previous.o, previous.c) &&
      Math.max(candle.o, candle.c) >= Math.max(previous.o, previous.c);
    if (direction === "down" && bullish(candle) && bearish(previous) && engulfsBody) {
      addPattern(
        patterns,
        candle,
        i,
        "Bullish engulfing",
        "bullish",
        bodyRatio >= 0.6 ? "strong" : "moderate",
        "Needs follow-through above its high; failure below its low invalidates it.",
      );
    } else if (direction === "up" && bearish(candle) && bullish(previous) && engulfsBody) {
      addPattern(
        patterns,
        candle,
        i,
        "Bearish engulfing",
        "bearish",
        bodyRatio >= 0.6 ? "strong" : "moderate",
        "Needs follow-through below its low; failure above its high invalidates it.",
      );
    }

    const inside = candle.h < previous.h && candle.l > previous.l;
    if (inside) {
      addPattern(
        patterns,
        candle,
        i,
        "Inside bar",
        "neutral",
        "moderate",
        "Compression only; direction confirms on a closed break of the mother candle.",
      );
    }
    const outside = candle.h > previous.h && candle.l < previous.l;
    if (outside) {
      addPattern(
        patterns,
        candle,
        i,
        "Outside bar",
        bullish(candle) ? "bullish" : bearish(candle) ? "bearish" : "neutral",
        bodyRatio >= 0.55 ? "strong" : "moderate",
        "Treat as expansion only after follow-through in the closing direction.",
      );
    }

    if (
      direction === "down" &&
      bearish(previous) &&
      bullish(candle) &&
      candle.c > midpoint(previous)
    ) {
      addPattern(
        patterns,
        candle,
        i,
        "Piercing pattern",
        "bullish",
        "moderate",
        "Needs a later close above the two-candle high.",
      );
    } else if (
      direction === "up" &&
      bullish(previous) &&
      bearish(candle) &&
      candle.c < midpoint(previous)
    ) {
      addPattern(
        patterns,
        candle,
        i,
        "Dark cloud cover",
        "bearish",
        "moderate",
        "Needs a later close below the two-candle low.",
      );
    }

    if (i < 2) continue;
    const first = candles[i - 2];
    const middle = candles[i - 1];
    const firstLarge = body(first) / range(first) >= 0.55;
    const middleSmall = body(middle) / range(middle) <= 0.35;
    if (
      direction === "down" &&
      bearish(first) &&
      firstLarge &&
      middleSmall &&
      bullish(candle) &&
      candle.c > midpoint(first)
    ) {
      addPattern(
        patterns,
        candle,
        i,
        "Morning star",
        "bullish",
        "strong",
        "Three-candle reversal candidate; confirm with a close above the pattern high.",
      );
    } else if (
      direction === "up" &&
      bullish(first) &&
      firstLarge &&
      middleSmall &&
      bearish(candle) &&
      candle.c < midpoint(first)
    ) {
      addPattern(
        patterns,
        candle,
        i,
        "Evening star",
        "bearish",
        "strong",
        "Three-candle reversal candidate; confirm with a close below the pattern low.",
      );
    }

    const threeBullish = bullish(first) && bullish(middle) && bullish(candle);
    const threeBearish = bearish(first) && bearish(middle) && bearish(candle);
    if (direction === "down" && threeBullish && first.c < middle.c && middle.c < candle.c) {
      addPattern(
        patterns,
        candle,
        i,
        "Three white soldiers",
        "bullish",
        "strong",
        "Momentum sequence; confirm that the next close holds above the middle candle.",
      );
    } else if (direction === "up" && threeBearish && first.c > middle.c && middle.c > candle.c) {
      addPattern(
        patterns,
        candle,
        i,
        "Three black crows",
        "bearish",
        "strong",
        "Momentum sequence; confirm that the next close holds below the middle candle.",
      );
    }
  }

  return { patterns, latest: patterns.filter((pattern) => pattern.index >= candles.length - 8) };
}
