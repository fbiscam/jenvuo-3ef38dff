import { atr, ema, lastFinite, type OhlcvBar } from "./indicators";

export type ProjectedCandle = OhlcvBar & { bullish: boolean };
export type CandleProjection = {
  candles: ProjectedCandle[];
  bias: "bullish" | "bearish" | "neutral";
  /** Directional agreement score, 50–72. A scenario, never a certainty. */
  confidence: number;
};

/**
 * Scenario "ghost" candles: a deterministic continuation guess built from
 * 10-bar structure trend, EMA20 slope, recent momentum and ATR. Stops at the
 * nearest resting liquidity in the bias direction. Not a trade signal.
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
  const votes = [structure, Math.sign(slope), Math.sign(momentum)];
  const score = votes.reduce((s, v) => s + v, 0);
  const bias = score >= 1 ? "bullish" : score <= -1 ? "bearish" : "neutral";
  const agree = votes.filter((v) => v !== 0 && Math.sign(v) === Math.sign(score)).length;
  const confidence = bias === "neutral" ? 50 : Math.min(72, 50 + agree * 6 + Math.min(4, Math.round(Math.abs(slope) * 2)));
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
  return { candles, bias, confidence };
}
