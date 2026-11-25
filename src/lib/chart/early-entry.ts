/**
 * Early entry (Candle 1 trigger). Closed candles only, never repaints.
 * Candle 0 = fresh extreme: its wick beats the previous LOOKBACK closed candles.
 * Candle 1 = the next closed candle: does not exceed candle 0's extreme, closes
 * in the reversal direction past candle 0's midpoint with a body ≥ MIN_BODY_ATR × ATR.
 * Entry = candle 1 close, SL = candle 0 extreme ± SL_ATR × ATR, TP1 = 2R, TP2 = 3R.
 * The newest trigger stays until a later closed wick reaches SL or TP2.
 * Does not wait for the FRACTAL_RADIUS label; not a guarantee.
 */
type Bar = { t: number; o: number; h: number; l: number; c: number };

export type EarlyEntry = {
  /** Candle 0 time (ms). */
  t: number;
  /** Candle 1 (trigger) time (ms). */
  triggerT: number;
  side: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
};

export const EARLY_LOOKBACK = 10;
export const EARLY_MIN_BODY_ATR = 0.3;
export const EARLY_SL_ATR = 0.1;
export const EARLY_TP1_R = 2;
export const EARLY_TP2_R = 3;

function atr(bars: Bar[], i: number, period = 14): number {
  let sum = 0;
  let n = 0;
  for (let k = Math.max(1, i - period + 1); k <= i; k++) {
    const b = bars[k], pc = bars[k - 1].c;
    sum += Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
    n++;
  }
  return n ? sum / n : 0;
}

export function triggerAt(closed: Bar[], i: number): EarlyEntry | null {
  if (i < EARLY_LOOKBACK || i + 1 >= closed.length) return null;
  const c0 = closed[i], c1 = closed[i + 1];
  const prev = closed.slice(i - EARLY_LOOKBACK, i);
  const a = atr(closed, i);
  if (!(a > 0)) return null;
  const mid = (c0.h + c0.l) / 2;
  const body = Math.abs(c1.c - c1.o);
  let side: "BUY" | "SELL" | null = null;
  if (prev.every((b) => c0.h > b.h) && c1.h <= c0.h && c1.c < c1.o && c1.c < mid && body >= EARLY_MIN_BODY_ATR * a) side = "SELL";
  else if (prev.every((b) => c0.l < b.l) && c1.l >= c0.l && c1.c > c1.o && c1.c > mid && body >= EARLY_MIN_BODY_ATR * a) side = "BUY";
  if (!side) return null;
  const sell = side === "SELL";
  const entry = c1.c;
  const sl = sell ? c0.h + a * EARLY_SL_ATR : c0.l - a * EARLY_SL_ATR;
  const risk = Math.abs(sl - entry);
  if (!(risk > 0)) return null;
  const dir = sell ? -1 : 1;
  return { t: c0.t, triggerT: c1.t, side, entry, sl, tp1: entry + dir * risk * EARLY_TP1_R, tp2: entry + dir * risk * EARLY_TP2_R };
}

/** Newest still-open early entry, or null. */
export function computeEarlyEntry(closed: Bar[]): EarlyEntry | null {
  for (let i = closed.length - 2; i >= EARLY_LOOKBACK; i--) {
    const e = triggerAt(closed, i);
    if (!e) continue;
    for (let k = i + 2; k < closed.length; k++) {
      const b = closed[k];
      if (e.side === "SELL" ? b.h >= e.sl || b.l <= e.tp2 : b.l <= e.sl || b.h >= e.tp2) return null;
    }
    return e;
  }
  return null;
}
