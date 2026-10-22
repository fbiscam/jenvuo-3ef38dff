/**
 * Fresh-swing setup gate: decides whether a confirmed high/low reversal has a
 * clear path, and builds its Entry / SL / TP.
 *
 * Closed candles only. A swing low (buy) is blocked when an unmitigated
 * BEARISH FVG still alive at the entry candle sits between entry and 2R (or
 * the entry is inside one); a swing high (sell) mirrors that with BULLISH FVGs.
 * Display only; no setup is ever guaranteed.
 */
import { detectLiveFvgs, type FreshFvg } from "./fresh-fvgs";

type Candle = { t: number; o: number; h: number; l: number; c: number };

export type SwingSetup = {
  side: "buy" | "sell";
  status: "valid" | "blocked" | "waiting";
  reason: string;
  entry?: number;
  stop?: number;
  target?: number;
  rr?: number;
  /** Opposing FVG that blocked the path, if any. */
  blocker?: Pick<FreshFvg, "top" | "bottom" | "type">;
};

export const SETUP_MIN_RR = 2;
export const SETUP_MAX_RR = 3;
export const SETUP_SL_BUFFER_ATR = 0.15;
export const SETUP_CONFIRM_BARS = 3;

function atrAt(bars: Candle[], end: number, period = 14): number {
  const first = Math.max(1, end - period + 1);
  let sum = 0;
  let n = 0;
  for (let i = first; i <= end; i++) {
    const b = bars[i];
    sum += Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c));
    n++;
  }
  return n ? sum / n : bars[end] ? bars[end].h - bars[end].l : 0;
}

/**
 * @param bars closed candles, oldest first
 * @param i index of the swing candle
 * @param kind "low" → buy setup, "high" → sell setup
 */
export function evaluateSwingSetup(bars: Candle[], i: number, kind: "high" | "low"): SwingSetup {
  const side = kind === "low" ? "buy" : "sell";
  const piv = bars[i];
  if (!piv || i < 15) return { side, status: "waiting", reason: "Not enough history" };
  const bodyTop = Math.max(piv.o, piv.c);
  const bodyBot = Math.min(piv.o, piv.c);
  // Confirmation: first closed candle within 3 bars that closes past the swing body.
  let k = -1;
  for (let j = i + 1; j <= Math.min(bars.length - 1, i + SETUP_CONFIRM_BARS); j++) {
    const b = bars[j];
    if (side === "buy" ? b.l < piv.l : b.h > piv.h) break; // extreme taken → no reversal
    if (side === "buy" ? b.c > bodyTop : b.c < bodyBot) {
      k = j;
      break;
    }
  }
  if (k < 0) return { side, status: "waiting", reason: "No closed confirmation candle" };
  const atr = atrAt(bars, k);
  const entry = bars[k].c;
  const stop = side === "buy" ? piv.l - atr * SETUP_SL_BUFFER_ATR : piv.h + atr * SETUP_SL_BUFFER_ATR;
  const risk = Math.abs(entry - stop);
  if (!(risk > 0)) return { side, status: "waiting", reason: "Invalid risk" };
  const minTarget = side === "buy" ? entry + risk * SETUP_MIN_RR : entry - risk * SETUP_MIN_RR;
  // Imbalances still alive when the entry candle closed (no look-ahead).
  const opposing = detectLiveFvgs(bars.slice(0, k + 1)).filter(
    (f) => f.type === (side === "buy" ? "BEARISH" : "BULLISH") && f.t < bars[k].t,
  );
  for (const f of opposing) {
    const inside = entry >= f.bottom && entry <= f.top;
    const inPath = side === "buy" ? f.bottom > entry && f.bottom < minTarget : f.top < entry && f.top > minTarget;
    if (inside || inPath) {
      return {
        side,
        status: "blocked",
        reason: inside ? "Entry inside unmitigated opposing FVG" : "Unmitigated opposing FVG before 2R",
        entry,
        stop,
        blocker: { top: f.top, bottom: f.bottom, type: f.type },
      };
    }
  }
  // Target: nearest opposing FVG edge beyond 2R, capped at 3R.
  const maxTarget = side === "buy" ? entry + risk * SETUP_MAX_RR : entry - risk * SETUP_MAX_RR;
  let target = maxTarget;
  for (const f of opposing) {
    const edge = side === "buy" ? f.bottom : f.top;
    if (side === "buy" ? edge >= minTarget && edge < target : edge <= minTarget && edge > target) target = edge;
  }
  const rr = Math.round((Math.abs(target - entry) / risk) * 10) / 10;
  return { side, status: "valid", reason: "Path clear to target", entry, stop, target, rr };
}
