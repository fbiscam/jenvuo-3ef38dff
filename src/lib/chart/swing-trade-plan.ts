/**
 * 1H fresh-swing trade plan (XAU/USD, BTC/USD, EUR/USD). Closed candles only.
 * A fresh HH/HL/LH/LL qualifies when a high-probability price action reaction
 * OR a strong held liquidity sweep printed at it (both = "A+" grade).
 * Entry = close of the candle that settles the verdict (PA: swing+3, sweep: swing+5),
 * SL = swing extreme ± 0.1 ATR(14), TP1 = 2R, TP2 = 3R.
 * The plan is dropped once a later closed candle's wick hits SL or TP2.
 */
type Bar = { t: number; o: number; h: number; l: number; c: number };

export type SwingTradePlan = {
  t: number;
  side: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  grade: "Sweep + PA" | "Sweep" | "Price action";
};

export const PLAN_SL_ATR = 0.1;
export const PLAN_TP1_R = 2;
export const PLAN_TP2_R = 3;

function atr(bars: Bar[], i: number, period = 14): number {
  let sum = 0;
  let n = 0;
  for (let k = Math.max(1, i - period + 1); k <= i; k++) {
    const b = bars[k];
    const pc = bars[k - 1].c;
    sum += Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
    n++;
  }
  return n ? sum / n : 0;
}

export function computeSwingTradePlan(
  closed: Bar[],
  swings: Array<{ index: number; kind: "high" | "low"; paOk: boolean; sweepOk: boolean }>,
): SwingTradePlan | null {
  const sorted = [...swings].filter((s) => s.paOk || s.sweepOk).sort((a, b) => b.index - a.index);
  const s = sorted[0];
  if (!s) return null;
  const entryIdx = s.index + (s.sweepOk ? 5 : 3);
  if (s.index < 1 || entryIdx >= closed.length) return null;
  const high = s.kind === "high";
  const sw = closed[s.index];
  const buf = atr(closed, s.index) * PLAN_SL_ATR;
  const entry = closed[entryIdx].c;
  const sl = high ? sw.h + buf : sw.l - buf;
  const risk = high ? sl - entry : entry - sl;
  if (!(risk > 0)) return null;
  const tp1 = high ? entry - risk * PLAN_TP1_R : entry + risk * PLAN_TP1_R;
  const tp2 = high ? entry - risk * PLAN_TP2_R : entry + risk * PLAN_TP2_R;
  for (let k = entryIdx + 1; k < closed.length; k++) {
    const b = closed[k];
    if (high ? b.h >= sl || b.l <= tp2 : b.l <= sl || b.h >= tp2) return null;
  }
  return {
    t: sw.t,
    side: high ? "SELL" : "BUY",
    entry,
    sl,
    tp1,
    tp2,
    grade: s.paOk && s.sweepOk ? "Sweep + PA" : s.sweepOk ? "Sweep" : "Price action",
  };
}
