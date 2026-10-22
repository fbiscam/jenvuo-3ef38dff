/**
 * Fresh High/Low Entry Finder (closed candles only, display only).
 *
 * For a fresh swing low (buy; a swing high mirrors it):
 * 1. Only the immediate previous leg counts: opposing (bearish) FVGs printed
 *    since the previous opposite swing must all be mitigated (closed beyond
 *    the far edge or filled) by the confirmation candle. Stacked FVGs in that
 *    one leg are reported as one supply block; otherwise as a ladder. Older
 *    swings are ignored. Unmitigated → "waiting" (WAIT, supply not cleaned).
 * 2. Confirmation: a closed candle within SETUP_CONFIRM_BARS closing past the
 *    swing candle body, without the swing extreme being taken first.
 * 3. Grade: demand (swing candle) + a same-direction FVG printed from the
 *    swing within SETUP_FVG_BARS = "best": entry at 50% of the FVG, SL behind
 *    the demand low + buffer, TP1 nearest opposing fresh FVG edge at ≥3R,
 *    TP2 previous swing liquidity. No FVG = "weak": entry on the break close,
 *    SL behind the swing, TP small (1R–1.5R, previous swing if inside).
 * No setup is ever guaranteed.
 */
import { detectLiveFvgs, type FreshFvg } from "./fresh-fvgs";

type Candle = { t: number; o: number; h: number; l: number; c: number };

export type SwingSetup = {
  side: "buy" | "sell";
  status: "valid" | "blocked" | "waiting";
  grade?: "best" | "weak";
  reason: string;
  entry?: number;
  stop?: number;
  target?: number;
  target2?: number;
  rr?: number;
  checklist?: { supplyCleared: boolean; demandZone: boolean; fvg: boolean };
  /** Opposing imbalance still unmitigated in the previous leg, if any. */
  blocker?: Pick<FreshFvg, "top" | "bottom" | "type">;
  blockerShape?: "block" | "ladder";
};

export const SETUP_BEST_MIN_RR = 3;
export const SETUP_WEAK_MAX_RR = 1.5;
export const SETUP_SL_BUFFER_ATR = 0.15;
/** 5 pips on gold = $0.50. */
export const SETUP_SL_MIN_BUFFER = 0.5;
export const SETUP_CONFIRM_BARS = 5;
export const SETUP_FVG_BARS = 5;
/** FVGs closer than this (in ATR) inside one leg form one block. */
export const SETUP_STACK_GAP_ATR = 0.5;

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

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * @param bars closed candles, oldest first
 * @param i index of the swing candle
 * @param kind "low" → buy setup, "high" → sell setup
 * @param prevOppIndex index of the immediate previous opposite swing (defaults to 20 bars back)
 */
export function evaluateSwingSetup(
  bars: Candle[],
  i: number,
  kind: "high" | "low",
  prevOppIndex?: number,
): SwingSetup {
  const side = kind === "low" ? "buy" : "sell";
  const buy = side === "buy";
  const piv = bars[i];
  if (!piv || i < 15) return { side, status: "waiting", reason: "Not enough history" };
  const legStart = Math.max(0, Math.min(i, prevOppIndex ?? i - 20));
  const bodyTop = Math.max(piv.o, piv.c);
  const bodyBot = Math.min(piv.o, piv.c);

  let k = -1;
  for (let j = i + 1; j <= Math.min(bars.length - 1, i + SETUP_CONFIRM_BARS); j++) {
    const b = bars[j];
    if (buy ? b.l < piv.l : b.h > piv.h) break;
    if (buy ? b.c > bodyTop : b.c < bodyBot) {
      k = j;
      break;
    }
  }
  if (k < 0) return { side, status: "waiting", reason: "No closed break of structure yet" };

  const atr = atrAt(bars, k);
  const live = detectLiveFvgs(bars.slice(0, k + 1));
  const legStartT = bars[legStart].t;

  // 1. Previous leg's opposing imbalances must be mitigated.
  const legOpp = live
    .filter((f) => f.type === (buy ? "BEARISH" : "BULLISH") && f.t >= legStartT && f.t < piv.t)
    .filter((f) => (buy ? f.bottom > piv.l : f.top < piv.h))
    .sort((a, b) => a.bottom - b.bottom);
  if (legOpp.length) {
    let stacked = true;
    for (let n = 1; n < legOpp.length; n++) {
      if (legOpp[n].bottom - legOpp[n - 1].top > atr * SETUP_STACK_GAP_ATR) stacked = false;
    }
    const top = Math.max(...legOpp.map((f) => f.top));
    const bottom = Math.min(...legOpp.map((f) => f.bottom));
    return {
      side,
      status: "waiting",
      reason: `WAIT - Previous ${buy ? "supply" : "demand"} not cleaned yet`,
      blocker: { top, bottom, type: legOpp[0].type },
      blockerShape: legOpp.length > 1 && !stacked ? "ladder" : "block",
      checklist: { supplyCleared: false, demandZone: true, fvg: false },
    };
  }

  // 2. Demand zone + same-direction FVG from the swing.
  const fvgEnd = bars[Math.min(bars.length - 1, i + SETUP_FVG_BARS)].t;
  const ownFvg = detectLiveFvgs(bars.slice(0, Math.min(bars.length, i + SETUP_FVG_BARS + 1)))
    .filter((f) => f.type === (buy ? "BULLISH" : "BEARISH") && f.t >= piv.t && f.t <= fvgEnd)
    .sort((a, b) => a.t - b.t)[0];
  const buffer = Math.max(SETUP_SL_MIN_BUFFER, atr * SETUP_SL_BUFFER_ATR);
  const stop = buy ? piv.l - buffer : piv.h + buffer;
  // Previous opposite swing extreme = liquidity target.
  let liq: number | undefined;
  if (legStart < i) {
    liq = buy ? Math.max(...bars.slice(legStart, i).map((b) => b.h)) : Math.min(...bars.slice(legStart, i).map((b) => b.l));
  }
  const opposingAhead = live.filter((f) => f.type === (buy ? "BEARISH" : "BULLISH"));

  if (ownFvg) {
    const entry = (ownFvg.top + ownFvg.bottom) / 2;
    const risk = Math.abs(entry - stop);
    if (!(risk > 0)) return { side, status: "waiting", reason: "Invalid risk" };
    const minT = buy ? entry + risk * SETUP_BEST_MIN_RR : entry - risk * SETUP_BEST_MIN_RR;
    let target = minT;
    let best: number | undefined;
    for (const f of opposingAhead) {
      const edge = buy ? f.bottom : f.top;
      if (buy ? edge >= minT && (best == null || edge < best) : edge <= minT && (best == null || edge > best)) best = edge;
    }
    if (best != null) target = best;
    const target2 = liq != null && (buy ? liq > target : liq < target) ? r2(liq) : undefined;
    return {
      side,
      status: "valid",
      grade: "best",
      reason: "Fresh best entry: demand + FVG, previous leg cleaned",
      entry: r2(entry),
      stop: r2(stop),
      target: r2(target),
      target2,
      rr: Math.round((Math.abs(target - entry) / risk) * 10) / 10,
      checklist: { supplyCleared: true, demandZone: true, fvg: true },
    };
  }

  const entry = bars[k].c;
  const risk = Math.abs(entry - stop);
  if (!(risk > 0)) return { side, status: "waiting", reason: "Invalid risk" };
  const capT = buy ? entry + risk * SETUP_WEAK_MAX_RR : entry - risk * SETUP_WEAK_MAX_RR;
  const minT = buy ? entry + risk : entry - risk;
  let target = capT;
  if (liq != null && (buy ? liq >= minT && liq < capT : liq <= minT && liq > capT)) target = liq;
  return {
    side,
    status: "valid",
    grade: "weak",
    reason: "Weak entry - small TP only, exit on next swing",
    entry: r2(entry),
    stop: r2(stop),
    target: r2(target),
    rr: Math.round((Math.abs(target - entry) / risk) * 10) / 10,
    checklist: { supplyCleared: true, demandZone: true, fvg: false },
  };
}
