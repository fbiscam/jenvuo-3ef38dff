/**
 * Fresh bullish / bearish Fair Value Gaps — same lifecycle as the fresh
 * supply/demand zones.
 *
 * - Built from CLOSED candles only (3-candle imbalance: candle 1 wick vs
 *   candle 3 wick), so every browser/account sees identical gaps and history
 *   never moves. A gap shows the moment its third candle closes.
 * - The middle (displacement) candle needs a real body and the gap must be at
 *   least FVG_MIN_SIZE_ATR of local ATR, so noise gaps are ignored.
 * - A closed candle beyond the far edge invalidates the gap (removed). A wick
 *   back into it marks it tested and tracks how much has been filled.
 * - Newest first: a newer same-type gap on top of an older one replaces it,
 *   kept gaps never stack, and only the newest FVG_MAX_TOTAL are returned.
 */
type Candle = { t: number; o: number; h: number; l: number; c: number };

export type FreshFvg = {
  type: "BULLISH" | "BEARISH";
  /** Time (ms) of the displacement (middle) candle — fixed left edge. */
  t: number;
  top: number;
  bottom: number;
  /** True while no later closed candle has wicked into the gap. */
  fresh: boolean;
  /** 0..1 share of the gap already filled by later wicks. */
  filled: number;
  /** Gap size in local ATR. */
  sizeAtr: number;
};

export const FVG_MIN_SIZE_ATR = 0.1;
export const FVG_MIN_BODY_RATIO = 0.5;
export const FVG_MAX_TOTAL = 4;
export const FVG_MIN_GAP_ATR = 0.15;
export const FVG_SUPERSEDE_ATR = 0.5;

function atrAt(bars: Candle[], end: number, period = 14): number {
  const first = Math.max(1, end - period + 1);
  let sum = 0;
  let n = 0;
  for (let i = first; i <= end && i < bars.length; i++) {
    const b = bars[i];
    const pc = bars[i - 1].c;
    sum += Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
    n++;
  }
  if (n) return sum / n;
  const b = bars[end];
  return b ? b.h - b.l : 0;
}

/** @param bars closed candles only, oldest first. */
export function computeFreshFvgs(bars: Candle[]): FreshFvg[] {
  if (bars.length < 20) return [];
  const last = bars.length - 1;
  const found: FreshFvg[] = [];

  for (let i = 1; i < last; i++) {
    const a = bars[i - 1];
    const mid = bars[i];
    const c = bars[i + 1];
    const bullish = c.l > a.h;
    const bearish = c.h < a.l;
    if (!bullish && !bearish) continue;
    const atr = atrAt(bars, i);
    if (!(atr > 0)) continue;
    const range = mid.h - mid.l;
    const body = Math.abs(mid.c - mid.o);
    if (!(range > 0) || body / range < FVG_MIN_BODY_RATIO) continue;
    if (bullish ? mid.c <= mid.o : mid.c >= mid.o) continue;
    const top = bullish ? c.l : a.l;
    const bottom = bullish ? a.h : c.h;
    const size = top - bottom;
    if (size < atr * FVG_MIN_SIZE_ATR) continue;

    // Lifecycle from the candle after the gap completes.
    let broken = false;
    let deepest = bullish ? top : bottom;
    for (let k = i + 2; k <= last; k++) {
      const b = bars[k];
      if (bullish ? b.c < bottom : b.c > top) {
        broken = true;
        break;
      }
      deepest = bullish ? Math.min(deepest, b.l) : Math.max(deepest, b.h);
    }
    if (broken) continue;
    const filledAbs = bullish ? top - deepest : deepest - bottom;
    const filled = Math.max(0, Math.min(1, filledAbs / size));
    if (filled >= 1) continue; // fully filled gaps are mitigated
    found.push({
      type: bullish ? "BULLISH" : "BEARISH",
      t: mid.t,
      top,
      bottom,
      fresh: filled === 0,
      filled: Math.round(filled * 100) / 100,
      sizeAtr: Math.round((size / atr) * 10) / 10,
    });
  }

  found.sort((x, y) => y.t - x.t);
  const nowAtr = Math.max(0, atrAt(bars, last));
  const gap = nowAtr * FVG_MIN_GAP_ATR;
  const supersede = nowAtr * FVG_SUPERSEDE_ATR;
  const kept: FreshFvg[] = [];
  for (const f of found) {
    if (kept.some((k) => k.type === f.type && f.bottom - supersede < k.top && f.top + supersede > k.bottom)) continue;
    if (kept.some((k) => f.bottom - gap < k.top && f.top + gap > k.bottom)) continue;
    kept.push(f);
    if (kept.length >= FVG_MAX_TOTAL) break;
  }
  return kept.sort((x, y) => x.t - y.t);
}
