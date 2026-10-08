import { ema } from "./indicators";

/**
 * Trend direction from CLOSED candles only, so every browser agrees and the
 * reading only changes when a candle closes. Five independent votes:
 *  1. Structure (weight 2): latest high/low labels HH+HL = up, LH+LL = down.
 *  2. Latest BOS/CHoCH direction.
 *  3. EMA 50 vs EMA 200.
 *  4. Last close vs EMA 50.
 *  5. Last close beyond the latest confirmed swing high / low.
 * Score ≥ +2 = Up, ≤ −2 = Down, otherwise Sideways. Strength = |score| / max.
 * Display only — never creates Entry/SL/TP.
 */
export type TrendDirection = "up" | "down" | "sideways";

export type TrendBias = {
  direction: TrendDirection;
  /** 0–100 agreement of the votes (not a win probability). */
  strength: number;
  score: number;
  max: number;
  reasons: string[];
};

type Bar = { t: number; c: number };
type Pivot = { t: number; price: number; kind: "high" | "low"; label: string };
type Break = { t: number; dir: "bullish" | "bearish"; type: string };

export const TREND_THRESHOLD = 2;

export function computeTrendBias(closed: Bar[], pivots: Pivot[], breaks: Break[]): TrendBias | null {
  if (closed.length < 20) return null;
  const close = closed[closed.length - 1].c;
  let score = 0;
  let max = 0;
  const reasons: string[] = [];

  const sorted = [...pivots].sort((a, b) => a.t - b.t);
  const lastHigh = [...sorted].reverse().find((p) => p.kind === "high");
  const lastLow = [...sorted].reverse().find((p) => p.kind === "low");
  if (lastHigh && lastLow) {
    max += 2;
    const upH = lastHigh.label === "HH";
    const upL = lastLow.label === "HL";
    const dnH = lastHigh.label === "LH";
    const dnL = lastLow.label === "LL";
    if (upH && upL) {
      score += 2;
      reasons.push("HH + HL");
    } else if (dnH && dnL) {
      score -= 2;
      reasons.push("LH + LL");
    } else {
      const newest = sorted[sorted.length - 1];
      const v = newest.label === "HH" || newest.label === "HL" ? 1 : newest.label === "LH" || newest.label === "LL" ? -1 : 0;
      score += v;
      reasons.push(`Mixed ${lastHigh.label}/${lastLow.label}`);
    }
  }

  const lastBreak = [...breaks].sort((a, b) => a.t - b.t).at(-1);
  if (lastBreak) {
    max += 1;
    score += lastBreak.dir === "bullish" ? 1 : -1;
    reasons.push(`${lastBreak.type === "CHOCH" ? "CHoCH" : lastBreak.type} ${lastBreak.dir}`);
  }

  const closes = closed.map((b) => b.c);
  const e50 = ema(closes, 50).at(-1);
  const e200 = closed.length >= 200 ? ema(closes, 200).at(-1) : undefined;
  if (e50 != null && Number.isFinite(e50) && e200 != null && Number.isFinite(e200)) {
    max += 1;
    score += e50 > e200 ? 1 : -1;
    reasons.push(e50 > e200 ? "EMA50 > EMA200" : "EMA50 < EMA200");
  }
  if (e50 != null && Number.isFinite(e50)) {
    max += 1;
    score += close > e50 ? 1 : -1;
    reasons.push(close > e50 ? "Price above EMA50" : "Price below EMA50");
  }

  if (lastHigh && close > lastHigh.price) {
    max += 1;
    score += 1;
    reasons.push("Closed above last high");
  } else if (lastLow && close < lastLow.price) {
    max += 1;
    score -= 1;
    reasons.push("Closed below last low");
  }

  if (max === 0) return null;
  const direction: TrendDirection = score >= TREND_THRESHOLD ? "up" : score <= -TREND_THRESHOLD ? "down" : "sideways";
  return { direction, strength: Math.round((Math.abs(score) / max) * 100), score, max, reasons };
}
