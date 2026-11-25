/**
 * One-candle strong SFP (swing failure): a single closed candle that sweeps the
 * previous SFP_LOOKBACK candles' extreme with its wick, closes back inside, and
 * shows an institutional rejection. Confirmed on that candle's own close, so the
 * trader can enter at the next candle's open. Closed candles only; display/alert only,
 * never Entry/SL/TP. Strict filters keep it rare instead of early-and-wrong.
 */
type Bar = { t: number; o: number; h: number; l: number; c: number };

export const SFP_LOOKBACK = 10;
/** Wick must poke past the swept level by at least this × average range. */
export const SFP_MIN_DEPTH = 0.15;
/** Rejection wick ≥ this × body. */
export const SFP_WICK_BODY = 2;
/** Rejection wick ≥ this share of the candle range. */
export const SFP_WICK_RANGE = 0.5;
/** Close must sit in the reversal-side portion of the candle (≤ 35% from its far end). */
export const SFP_CLOSE_ZONE = 0.35;
/** Candle range ≥ this × average range (no tiny candles). */
export const SFP_MIN_RANGE = 1;
/** Close back inside by at least this × average range (not a marginal reclaim). */
export const SFP_MIN_RECLAIM = 0.1;

export type SfpSignal = { t: number; index: number; side: "sell" | "buy"; level: number; extreme: number; close: number };

export function classifySfp(closed: Bar[], i: number): SfpSignal | null {
  if (i < SFP_LOOKBACK || i >= closed.length) return null;
  const s = closed[i]!;
  let hi = -Infinity, lo = Infinity, avg = 0;
  for (let k = i - SFP_LOOKBACK; k < i; k++) {
    const b = closed[k]!;
    hi = Math.max(hi, b.h); lo = Math.min(lo, b.l); avg += b.h - b.l;
  }
  avg /= SFP_LOOKBACK;
  const range = s.h - s.l;
  if (!(avg > 0) || range < avg * SFP_MIN_RANGE) return null;
  const body = Math.abs(s.c - s.o);
  const upper = s.h - Math.max(s.o, s.c);
  const lower = Math.min(s.o, s.c) - s.l;
  const tookHigh = s.h - hi >= avg * SFP_MIN_DEPTH;
  const tookLow = lo - s.l >= avg * SFP_MIN_DEPTH;
  if (tookHigh && !tookLow && hi - s.c >= avg * SFP_MIN_RECLAIM && upper >= SFP_WICK_BODY * body && upper >= SFP_WICK_RANGE * range && (s.c - s.l) / range <= SFP_CLOSE_ZONE) {
    return { t: s.t, index: i, side: "sell", level: hi, extreme: s.h, close: s.c };
  }
  if (tookLow && !tookHigh && s.c - lo >= avg * SFP_MIN_RECLAIM && lower >= SFP_WICK_BODY * body && lower >= SFP_WICK_RANGE * range && (s.h - s.c) / range <= SFP_CLOSE_ZONE) {
    return { t: s.t, index: i, side: "buy", level: lo, extreme: s.l, close: s.c };
  }
  return null;
}

/** Every strong SFP in the closed candles (oldest first). */
export function computeSfpSignals(closed: Bar[]): SfpSignal[] {
  const out: SfpSignal[] = [];
  for (let i = SFP_LOOKBACK; i < closed.length; i++) {
    const s = classifySfp(closed, i);
    if (s) out.push(s);
  }
  return out;
}
