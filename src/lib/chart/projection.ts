import { atr, ema, lastFinite, type OhlcvBar } from "./indicators";

export type ProjectedCandle = OhlcvBar & { bullish: boolean };
export type CandleProjection = {
  candles: ProjectedCandle[];
  bias: "bullish" | "bearish" | "neutral";
  /** Directional agreement score, 50–72. A scenario, never a certainty. */
  confidence: number;
  /** True when price is reacting within 0.35 ATR of a verified extreme. */
  extremeReaction: boolean;
};

/**
 * Scenario "ghost" candles: a deterministic continuation guess built from
 * 10-bar structure trend, EMA20 slope, recent momentum, ATR and confirmed
 * rejection at nearby liquidity/range extremes. Stops at the nearest resting
 * liquidity in the bias direction. Not a trade signal.
 */
export function projectNextCandles(
  bars: OhlcvBar[],
  stepSeconds: number,
  trend: string,
  buySide: number[],
  sellSide: number[],
  count = 4,
): CandleProjection | null {
  if (bars.length < 30 || stepSeconds <= 0) return null;
  const a = lastFinite(atr(bars, 14));
  if (!a || !Number.isFinite(a) || a <= 0) return null;
  const e = ema(bars.map((b) => b.close), 20);
  const n = bars.length;
  const slope = (e[n - 1] - e[n - 6]) / a;
  const momentum = (bars[n - 1].close - bars[n - 4].close) / a;
  const t = trend.toLowerCase();
  const structure = t.includes("bull") ? 1 : t.includes("bear") ? -1 : 0;
  const last = bars[n - 1];
  const range = Math.max(last.high - last.low, Number.EPSILON);
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const recent = bars.slice(-50);
  const rangeHigh = Math.max(...recent.map((bar) => bar.high));
  const rangeLow = Math.min(...recent.map((bar) => bar.low));
  const nearestHigh = [...buySide, rangeHigh]
    .filter((price) => Number.isFinite(price) && price >= last.close)
    .sort((x, y) => x - y)[0];
  const nearestLow = [...sellSide, rangeLow]
    .filter((price) => Number.isFinite(price) && price <= last.close)
    .sort((x, y) => y - x)[0];
  const atUpperExtreme = nearestHigh != null && Math.abs(nearestHigh - last.high) <= a * 0.35;
  const atLowerExtreme = nearestLow != null && Math.abs(last.low - nearestLow) <= a * 0.35;
  // An extreme only changes direction after the live candle visibly rejects it.
  // Mere proximity is not enough, which prevents blind counter-trend guesses.
  const bearishRejection = atUpperExtreme && upperWick / range >= 0.45 && last.close < last.open;
  const bullishRejection = atLowerExtreme && lowerWick / range >= 0.45 && last.close > last.open;
  const extremeVote = bullishRejection ? 2 : bearishRejection ? -2 : 0;
  const votes = [structure, Math.sign(slope), Math.sign(momentum), extremeVote];
  const score = votes.reduce((sum, vote) => sum + vote, 0);
  const bias = score >= 1 ? "bullish" : score <= -1 ? "bearish" : "neutral";
  const agree = votes.filter((vote) => vote !== 0 && Math.sign(vote) === Math.sign(score)).length;
  const extremeReaction = bullishRejection || bearishRejection;
  const confidence = bias === "neutral"
    ? 50
    : Math.min(72, 50 + agree * 5 + (extremeReaction && Math.sign(extremeVote) === Math.sign(score) ? 5 : 0) + Math.min(2, Math.round(Math.abs(slope))));
  const dir = bias === "bullish" ? 1 : bias === "bearish" ? -1 : 0;
  const cap = dir > 0 ? buySide.filter((p) => p > bars[n - 1].close).sort((x, y) => x - y)[0]
    : dir < 0 ? sellSide.filter((p) => p < bars[n - 1].close).sort((x, y) => y - x)[0] : undefined;

  // Candle pattern: impulse, impulse, pullback, continuation (neutral = chop).
  const pattern = dir === 0 ? [0.25, -0.3, 0.2, -0.15] : [0.45, 0.35, -0.2, 0.3];
  const candles: ProjectedCandle[] = [];
  let open = bars[n - 1].close;
  for (let i = 0; i < count; i++) {
    const move = (dir === 0 ? 1 : dir) * pattern[i % pattern.length] * a;
    let close = open + move;
    if (cap != null && ((dir > 0 && close > cap) || (dir < 0 && close < cap))) close = cap;
    const wick = a * 0.2;
    candles.push({
      time: bars[n - 1].time + stepSeconds * (i + 1),
      open,
      close,
      high: Math.max(open, close) + wick,
      low: Math.min(open, close) - wick,
      volume: 0,
      bullish: close >= open,
    });
    open = close;
  }
  return { candles, bias, confidence, extremeReaction };
}
