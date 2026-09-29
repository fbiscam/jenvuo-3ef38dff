/**
 * Liquidity sweep engine (deterministic, closed-candle only).
 *
 * - Pools: untaken swing highs (BSL) / lows (SSL) from 3-bar internal swings
 *   plus the 10-bar structure swings. Swings within 0.15 ATR cluster into
 *   equal highs / equal lows (EQH / EQL) — the strongest resting liquidity.
 * - Each pool gets a 0-100 sweep-target score (equal touches, major swing,
 *   outer extreme, proximity). No single clue can make a pool strong.
 *   The best pool per side is flagged as the NEXT SWEEP target.
 * - Sweeps: a closed candle wicks beyond a pool and closes back inside
 *   (or closes beyond and the very next closed candle closes back inside).
 *   A close beyond that is not reclaimed is a run, not a sweep. A sweep is
 *   confirmed when the following closed candle holds back inside the level.
 * - Every value is anchored to the sweep candle's local ATR, so historical
 *   sweeps never change once printed. The forming candle only flags a pool
 *   as "sweeping" — it never creates or removes history.
 */

type Candle = { t: number; o: number; h: number; l: number; c: number };
type Pivot = { index: number; t: number; price: number; kind: "high" | "low" };

export type LiquiditySide = "BSL" | "SSL";

export type LiquidityPool = {
  side: LiquiditySide;
  /** Level that has to be taken (highest high of the cluster / lowest low). */
  level: number;
  /** Earliest swing time (ms) in the pool — the line's left edge. */
  t: number;
  touches: Array<{ t: number; price: number }>;
  /** Number of equal swings resting at this level (2+ = EQH / EQL). */
  count: number;
  /** Contains a 10-bar structure swing. */
  major: boolean;
  /** Level is the outermost high/low of the last LIQ_EXTREME_LOOKBACK closed bars. */
  outer: boolean;
  distanceAtr: number;
  /** Deterministic 0-100 sweep-target score. */
  score: number;
  /** Best target on its side. */
  next: boolean;
  /** Forming candle is trading beyond the level right now. */
  taking: boolean;
};

export type LiquiditySweep = {
  side: LiquiditySide;
  level: number;
  /** Time (ms) of the swing whose liquidity was taken. */
  fromT: number;
  /** Candle (ms) whose wick took the liquidity. */
  t: number;
  /** Wick extreme beyond the level. */
  extreme: number;
  /** Swings taken by this sweep. */
  count: number;
  major: boolean;
  /** 0-100 deterministic strength. */
  strength: number;
  strong: boolean;
  /** Reclaimed on the next candle (close beyond, then close back inside). */
  twoBar: boolean;
  /** Next closed candle held back inside the level. */
  confirmed: boolean;
};

export type LiquidityMap = { pools: LiquidityPool[]; sweeps: LiquiditySweep[] };

export const LIQ_INTERNAL_RADIUS = 3;
export const LIQ_EQUAL_TOL_ATR = 0.15;
export const LIQ_MAX_POOLS_PER_SIDE = 3;
export const LIQ_MAX_DISTANCE_ATR = 8;
export const LIQ_MAX_SWEEPS = 6;
export const LIQ_EXTREME_LOOKBACK = 100;
export const LIQ_STRONG_SWEEP = 60;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function localAtr(bars: Candle[]): (i: number) => number {
  const tr = bars.map((b, i) =>
    i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c)),
  );
  const prefix = [0];
  for (const v of tr) prefix.push(prefix[prefix.length - 1] + v);
  return (i: number) => {
    const end = Math.max(0, Math.min(bars.length - 1, i));
    const start = Math.max(0, end - 13);
    const n = end - start + 1;
    return n > 0 ? (prefix[end + 1] - prefix[start]) / n : 0;
  };
}

function internalPivots(bars: Candle[], r: number): Pivot[] {
  const out: Pivot[] = [];
  for (let i = r; i < bars.length - r; i++) {
    let hi = true;
    let lo = true;
    for (let j = i - r; j <= i + r && (hi || lo); j++) {
      if (j === i) continue;
      if (j < i ? bars[j].h >= bars[i].h : bars[j].h > bars[i].h) hi = false;
      if (j < i ? bars[j].l <= bars[i].l : bars[j].l < bars[i].l) lo = false;
    }
    if (hi) out.push({ index: i, t: bars[i].t, price: bars[i].h, kind: "high" });
    if (lo) out.push({ index: i, t: bars[i].t, price: bars[i].l, kind: "low" });
  }
  return out;
}

/**
 * @param closed closed candles only (oldest first)
 * @param forming the still-forming candle, if any (only flags pools as "taking")
 * @param majorPivots 10-bar structure pivots indexed into `closed`
 */
export function computeLiquidityMap(
  closed: Candle[],
  forming: Candle | null = null,
  majorPivots: Pivot[] = [],
): LiquidityMap {
  if (closed.length < 2 * LIQ_INTERNAL_RADIUS + 2) return { pools: [], sweeps: [] };
  const atrAt = localAtr(closed);
  const last = closed.length - 1;
  const majorKeys = new Set(majorPivots.map((p) => `${p.kind}:${p.index}`));
  const byKey = new Map<string, Pivot & { major: boolean }>();
  for (const p of internalPivots(closed, LIQ_INTERNAL_RADIUS))
    byKey.set(`${p.kind}:${p.index}`, { ...p, major: majorKeys.has(`${p.kind}:${p.index}`) });
  for (const p of majorPivots)
    if (p.index >= 0 && p.index <= last) byKey.set(`${p.kind}:${p.index}`, { ...p, major: true });
  const pivots = [...byKey.values()].sort((a, b) => a.index - b.index);

  const resting: Array<Pivot & { major: boolean }> = [];
  const events = new Map<string, { side: LiquiditySide; k: number; twoBar: boolean; swept: Array<Pivot & { major: boolean }> }>();

  for (const p of pivots) {
    const high = p.kind === "high";
    let k = -1;
    for (let j = p.index + 1; j <= last; j++) {
      if (high ? closed[j].h > p.price : closed[j].l < p.price) {
        k = j;
        break;
      }
    }
    if (k < 0) {
      resting.push(p);
      continue;
    }
    const inside = (c: number) => (high ? c < p.price : c > p.price);
    let twoBar = false;
    if (!inside(closed[k].c)) {
      // Close beyond: only a sweep if the very next closed candle reclaims.
      if (k + 1 > last || !inside(closed[k + 1].c)) continue;
      twoBar = true;
    }
    const side: LiquiditySide = high ? "BSL" : "SSL";
    const key = `${side}:${k}`;
    const ev = events.get(key) ?? { side, k, twoBar, swept: [] };
    ev.twoBar = ev.twoBar && twoBar;
    ev.swept.push(p);
    events.set(key, ev);
  }

  const sweeps: LiquiditySweep[] = [];
  for (const ev of events.values()) {
    const bsl = ev.side === "BSL";
    const top = ev.swept.reduce((a, b) => (bsl ? (b.price > a.price ? b : a) : b.price < a.price ? b : a));
    const level = top.price;
    const c = closed[ev.k];
    const holdIdx = ev.k + (ev.twoBar ? 2 : 1);
    const reclaimIdx = ev.k + (ev.twoBar ? 1 : 0);
    // A later close back beyond the level turns the sweep into a failed run.
    if (holdIdx <= last && (bsl ? closed[holdIdx].c > level : closed[holdIdx].c < level)) continue;
    const atr = atrAt(ev.k) || 1e-9;
    const range = c.h - c.l || 1e-9;
    const wick = bsl ? c.h - Math.max(c.o, c.c) : Math.min(c.o, c.c) - c.l;
    const reclaim = Math.abs(level - closed[reclaimIdx].c) / atr;
    const extreme = bsl ? c.h : c.l;
    let outer = true;
    for (let j = Math.max(0, ev.k - 50); j < ev.k; j++)
      if (bsl ? closed[j].h >= extreme : closed[j].l <= extreme) outer = false;
    const major = ev.swept.some((p) => p.major);
    const strength = Math.round(
      Math.min(
        100,
        30 * clamp01(wick / range / 0.6) +
          25 * clamp01(reclaim / 0.5) +
          20 * clamp01((ev.swept.length - 1) / 2) +
          (major ? 15 : 0) +
          (outer ? 10 : 0) -
          (ev.twoBar ? 10 : 0),
      ),
    );
    sweeps.push({
      side: ev.side,
      level,
      fromT: top.t,
      t: c.t,
      extreme,
      count: ev.swept.length,
      major,
      strength: Math.max(0, strength),
      strong: strength >= LIQ_STRONG_SWEEP,
      twoBar: ev.twoBar,
      confirmed: holdIdx <= last,
    });
  }
  sweeps.sort((a, b) => a.t - b.t);

  // ---- resting pools ----
  const atrNow = atrAt(last) || 1e-9;
  const tol = LIQ_EQUAL_TOL_ATR * atrNow;
  const lastClose = closed[last].c;
  const lookFrom = Math.max(0, closed.length - LIQ_EXTREME_LOOKBACK);
  let maxH = -Infinity;
  let minL = Infinity;
  for (let j = lookFrom; j <= last; j++) {
    maxH = Math.max(maxH, closed[j].h);
    minL = Math.min(minL, closed[j].l);
  }
  const pools: LiquidityPool[] = [];
  for (const side of ["BSL", "SSL"] as const) {
    const bsl = side === "BSL";
    const list = resting
      .filter((p) => p.kind === (bsl ? "high" : "low"))
      .sort((a, b) => (bsl ? b.price - a.price : a.price - b.price));
    const clusters: Array<typeof list> = [];
    for (const p of list) {
      const cur = clusters[clusters.length - 1];
      if (cur && Math.abs(cur[0].price - p.price) <= tol) cur.push(p);
      else clusters.push([p]);
    }
    const sidePools = clusters.map((cl): LiquidityPool => {
      const level = cl[0].price;
      const count = cl.length;
      const major = cl.some((p) => p.major);
      const outer = bsl ? level >= maxH : level <= minL;
      const distanceAtr = Math.abs(level - lastClose) / atrNow;
      const score = Math.round(
        Math.min(
          100,
          15 +
            (count >= 3 ? 35 : count === 2 ? 25 : 0) +
            (major ? 15 : 0) +
            (outer ? 10 : 0) +
            25 * Math.max(0, 1 - distanceAtr / LIQ_MAX_DISTANCE_ATR),
        ),
      );
      return {
        side,
        level,
        t: Math.min(...cl.map((p) => p.t)),
        touches: cl.map((p) => ({ t: p.t, price: p.price })).sort((a, b) => a.t - b.t),
        count,
        major,
        outer,
        distanceAtr,
        score,
        next: false,
        taking: forming ? (bsl ? forming.h > level : forming.l < level) : false,
      };
    });
    const kept = sidePools
      .filter((p) => p.distanceAtr <= LIQ_MAX_DISTANCE_ATR)
      .sort((a, b) => b.score - a.score || a.distanceAtr - b.distanceAtr)
      .slice(0, LIQ_MAX_POOLS_PER_SIDE);
    if (kept[0]) kept[0].next = true;
    pools.push(...kept.sort((a, b) => (bsl ? a.level - b.level : b.level - a.level)));
  }

  return { pools, sweeps: sweeps.slice(-LIQ_MAX_SWEEPS) };
}
