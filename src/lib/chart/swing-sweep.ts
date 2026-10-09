/**
 * Fresh-swing liquidity sweep (4H tool). Closed candles only.
 *
 * At a fresh swing high (low) candle, did its wick take the highest high
 * (lowest low) of the previous SWEEP_LOOKBACK closed candles and close back
 * inside (or the very next closed candle closed back inside)? Then, did
 * price move away in the reversal direction — a close beyond the swing
 * candle's body within SWEEP_MOVE_BARS closed candles?
 * Verdict is "pending" until those candles close, then never changes.
 */
type Bar = { t: number; o: number; h: number; l: number; c: number };

export type SwingSweepStatus = "confirmed" | "failed" | "none" | "pending";
export type SwingSweep = { status: SwingSweepStatus; level: number | null; text: string };

export const SWEEP_LOOKBACK = 10;
export const SWEEP_MOVE_BARS = 2;

export function classifySwingSweep(closed: Bar[], i: number, kind: "high" | "low"): SwingSweep {
  const high = kind === "high";
  if (i < SWEEP_LOOKBACK || i >= closed.length) return { status: "none", level: null, text: "No sweep" };
  let level = high ? -Infinity : Infinity;
  for (let k = i - SWEEP_LOOKBACK; k < i; k++) level = high ? Math.max(level, closed[k].h) : Math.min(level, closed[k].l);
  const s = closed[i];
  const took = high ? s.h > level : s.l < level;
  if (!took) return { status: "none", level, text: "No sweep" };
  const inside = (c: number) => (high ? c < level : c > level);
  let reclaim = i;
  if (!inside(s.c)) {
    if (i + 1 >= closed.length) return { status: "pending", level, text: "Sweep? waiting" };
    if (!inside(closed[i + 1].c)) return { status: "none", level, text: "No sweep (broke out)" };
    reclaim = i + 1;
  }
  const bodyEdge = high ? Math.min(s.o, s.c) : Math.max(s.o, s.c);
  const last = Math.min(closed.length - 1, reclaim + SWEEP_MOVE_BARS);
  for (let k = reclaim + 1; k <= last; k++) {
    const c = closed[k].c;
    if (high ? c > s.h : c < s.l) return { status: "failed", level, text: "Sweep failed" };
    if (high ? c < bodyEdge : c > bodyEdge) return { status: "confirmed", level, text: "Sweep ✓ confirmed" };
  }
  if (last < reclaim + SWEEP_MOVE_BARS) return { status: "pending", level, text: "Sweep – waiting move" };
  return { status: "failed", level, text: "Sweep, no move" };
}
