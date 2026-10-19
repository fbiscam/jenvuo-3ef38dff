import { ema, macd, rsi, sma, type OhlcvBar } from "./indicators";

export type TechVerdict = "buy" | "sell" | "neutral";
export type TechRating = "Strong sell" | "Sell" | "Neutral" | "Buy" | "Strong buy";

export type TechReading = { name: string; value: number; verdict: TechVerdict };

export type TechnicalSummary = {
  oscillators: TechReading[];
  movingAverages: TechReading[];
  /** -1 (all sell) … +1 (all buy). */
  score: number;
  rating: TechRating;
  counts: { buy: number; sell: number; neutral: number };
};

const last = (values: number[]) => {
  for (let i = values.length - 1; i >= 0; i--) if (Number.isFinite(values[i])) return values[i];
  return NaN;
};

/** Score → label, TradingView-style cut points (±0.1 neutral band, ±0.5 strong). */
export function ratingFor(score: number): TechRating {
  if (score >= 0.5) return "Strong buy";
  if (score > 0.1) return "Buy";
  if (score <= -0.5) return "Strong sell";
  if (score < -0.1) return "Sell";
  return "Neutral";
}

/**
 * Indicator readings for the Terminal "Technicals" card, from closed candles only.
 * Display only — never produces Entry/SL/TP.
 * - RSI(14): < 30 buy, > 70 sell.
 * - MACD(12,26,9): line above signal buy, below sell.
 * - Momentum(10): close above close 10 bars ago buy, below sell.
 * - Moving averages: price above the average buy, below sell.
 */
export function technicalSummary(bars: OhlcvBar[]): TechnicalSummary | null {
  if (bars.length < 30) return null;
  const closes = bars.map((b) => b.close);
  const price = closes[closes.length - 1];

  const oscillators: TechReading[] = [];
  const r = last(rsi(closes, 14));
  if (Number.isFinite(r)) oscillators.push({ name: "RSI (14)", value: r, verdict: r < 30 ? "buy" : r > 70 ? "sell" : "neutral" });
  const m = macd(closes);
  const ml = last(m.macd);
  const ms = last(m.signal);
  if (Number.isFinite(ml) && Number.isFinite(ms))
    oscillators.push({ name: "MACD (12, 26)", value: ml, verdict: ml > ms ? "buy" : ml < ms ? "sell" : "neutral" });
  if (closes.length > 10) {
    const mom = price - closes[closes.length - 11];
    oscillators.push({ name: "Momentum (10)", value: mom, verdict: mom > 0 ? "buy" : mom < 0 ? "sell" : "neutral" });
  }

  const movingAverages: TechReading[] = [];
  for (const [label, fn, len] of [
    ["EMA (10)", ema, 10],
    ["EMA (20)", ema, 20],
    ["EMA (50)", ema, 50],
    ["EMA (100)", ema, 100],
    ["EMA (200)", ema, 200],
    ["SMA (20)", sma, 20],
    ["SMA (50)", sma, 50],
    ["SMA (200)", sma, 200],
  ] as const) {
    const v = last(fn(closes, len));
    if (!Number.isFinite(v)) continue;
    movingAverages.push({ name: label, value: v, verdict: price > v ? "buy" : price < v ? "sell" : "neutral" });
  }

  const all = [...oscillators, ...movingAverages];
  const counts = { buy: 0, sell: 0, neutral: 0 };
  for (const x of all) counts[x.verdict]++;
  const score = all.length ? (counts.buy - counts.sell) / all.length : 0;
  return { oscillators, movingAverages, score, rating: ratingFor(score), counts };
}
