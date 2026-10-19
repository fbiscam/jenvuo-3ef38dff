import type { OhlcvBar } from "./indicators";

/** Look-back windows shown in the Terminal "Performance" card (seconds). */
export const PERF_WINDOWS = [
  { label: "1H", secs: 3_600 },
  { label: "4H", secs: 14_400 },
  { label: "1D", secs: 86_400 },
  { label: "3D", secs: 259_200 },
  { label: "1W", secs: 604_800 },
  { label: "1M", secs: 2_592_000 },
] as const;

export type PerfPoint = { label: string; pct: number };

/**
 * % change of the last close against the close at (or just before) each
 * look-back. A window is skipped when the loaded candles do not reach back that
 * far or when it is shorter than two candles of the current timeframe.
 */
export function performance(bars: OhlcvBar[], stepSeconds: number): PerfPoint[] {
  const last = bars.at(-1);
  if (!last || bars.length < 2) return [];
  const out: PerfPoint[] = [];
  for (const w of PERF_WINDOWS) {
    if (w.secs < stepSeconds * 2) continue;
    const target = last.time - w.secs;
    if (bars[0].time > target) continue;
    let lo = 0;
    let hi = bars.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (bars[mid].time <= target) lo = mid;
      else hi = mid - 1;
    }
    const base = bars[lo].close;
    if (!base) continue;
    out.push({ label: w.label, pct: ((last.close - base) / base) * 100 });
  }
  return out;
}

function sma(values: number[], length: number): number | null {
  if (values.length < length) return null;
  let sum = 0;
  for (let i = values.length - length; i < values.length; i++) sum += values[i];
  return sum / length;
}

/** Wilder RSI of the latest close. */
export function rsi(values: number[], length = 14): number | null {
  if (values.length <= length) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= length;
  loss /= length;
  for (let i = length + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (length - 1) + Math.max(d, 0)) / length;
    loss = (loss * (length - 1) + Math.max(-d, 0)) / length;
  }
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}

export type TechnicalRating = "Strong sell" | "Sell" | "Neutral" | "Buy" | "Strong buy";

export type Technicals = {
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  /** -1 (all sell votes) … +1 (all buy votes). */
  score: number;
  rating: TechnicalRating;
};

export function ratingFor(score: number): TechnicalRating {
  if (score <= -0.6) return "Strong sell";
  if (score <= -0.2) return "Sell";
  if (score < 0.2) return "Neutral";
  if (score < 0.6) return "Buy";
  return "Strong buy";
}

/**
 * Rule-based technical read: four equal votes — price vs SMA20, price vs SMA50,
 * RSI above 55 / below 45, and the Jenvu SMC structure trend.
 */
export function technicals(bars: OhlcvBar[], trend: string): Technicals {
  const closes = bars.map((b) => b.close);
  const price = closes.at(-1) ?? 0;
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const r = rsi(closes);
  const votes: number[] = [];
  if (s20 != null) votes.push(price > s20 ? 1 : price < s20 ? -1 : 0);
  if (s50 != null) votes.push(price > s50 ? 1 : price < s50 ? -1 : 0);
  if (r != null) votes.push(r > 55 ? 1 : r < 45 ? -1 : 0);
  votes.push(/bull/i.test(trend) ? 1 : /bear/i.test(trend) ? -1 : 0);
  const score = votes.reduce((a, b) => a + b, 0) / votes.length;
  return { rsi: r, sma20: s20, sma50: s50, score, rating: ratingFor(score) };
}
