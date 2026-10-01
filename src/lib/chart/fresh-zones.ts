/**
 * Supply & demand zones built from every HH/HL/LH/LL swing.
 *
 * - Live swings show their zone the moment the label appears.
 * - Confirmed swings keep a zone only after closed-body displacement
 *   (>= SD_MIN_DISPLACEMENT_ATR within the confirmation window).
 * - Zones are anchored to the swing candle (body edge -> wick extreme) so they
 *   never move once printed. A closed candle beyond the far edge deletes the
 *   zone; a wick back into it marks it tested (no longer fresh).
 * - Each zone gets a deterministic strength score (displacement, outer
 *   extreme, wick rejection, freshness) and every fresh zone carries a
 *   limit-order trade plan (entry at the proximal edge, SL beyond the extreme,
 *   TP1 = 2R, TP2 = 3R).
 * - Only STRONG zones (strength >= SD_MIN_STRENGTH) are shown, so the chart
 *   only marks zones price is likely to respect.
 * - Strategy gate: a zone is shown only when a same-direction displacement
 *   FVG formed as price left it (bearish FVG under supply, bullish FVG above
 *   demand). That FVG is stored on the zone and drawn with it.
 * - A zone is rejected when an opposing, still-alive FVG prints after it on
 *   the zone's side of price (bearish FVG just above a demand zone, bullish
 *   FVG just below a supply zone): sellers/buyers are displacing toward the
 *   zone, so it is likely to break rather than hold.
 * - Only the newest SD_MAX_TOTAL zones are returned, so older zones hide as new
 *   ones form.
 */
import type { StructurePivot } from "@/lib/analysis/market-structure-evidence";
import { detectLiveFvgs, FVG_MIN_BODY_RATIO, FVG_MIN_SIZE_ATR, type FreshFvg } from "./fresh-fvgs";

type Candle = { t: number; o: number; h: number; l: number; c: number };

export type SdGrade = "EXTREME" | "STRONG" | "MODERATE";

export type SdTradePlan = {
  side: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
};

export type SdZone = {
  type: "SUPPLY" | "DEMAND";
  /** Swing candle time (ms) — the zone's fixed left edge. */
  t: number;
  top: number;
  bottom: number;
  /** Swing label that created the zone (HH / LH / LL / HL / H / L). */
  label: StructurePivot["label"];
  /** True while no later candle has traded back into the zone. */
  fresh: boolean;
  /** Times price wicked into the zone after it formed. */
  touches: number;
  /** Close-based displacement away from the swing, in ATR. */
  displacementAtr: number;
  /** True when the swing wick is the outermost high/low of the prior 50 candles. */
  extreme: boolean;
  /** Exact wick price of the swing (zone's far edge). */
  extremeLevel: number;
  /** Swing is still forming (not yet confirmed) — shown immediately. */
  live: boolean;
  /** A same-direction 3-candle imbalance formed in the departure leg. */
  imbalance?: boolean;
  /** The displacement FVG that left this zone (drawn together with it). */
  fvg?: FreshFvg;
  /** Deterministic 0-100 strength score. */
  strength: number;
  grade: SdGrade;
  /** Entry / SL / TP levels — kept only on the latest zone. */
  plan?: SdTradePlan;
  /** The zone's own levels (always set) so the chart can move the plan to
   *  the newest zone still visible after overlap removal. */
  levels?: SdTradePlan;
};

export type ZonePivot = Pick<StructurePivot, "index" | "t" | "price" | "kind" | "label"> & { live?: boolean };

/** Confirmed swings need this much closed-body displacement to keep a zone. */
export const SD_MIN_DISPLACEMENT_ATR = 0.5;
/** Newest zones shown on the chart (both sides together). */
export const SD_MAX_TOTAL = 3;
/** Minimum clear gap between any two kept zones, in current ATR, so they never stack. */
export const SD_MIN_GAP_ATR = 0.3;
/** A newer same-type zone printed on top of (or within this many ATR of) an older one replaces it. */
export const SD_SUPERSEDE_ATR = 1;
export const SD_EXTREME_LOOKBACK = 50;
export const SD_SL_BUFFER_ATR = 0.25;
/** Entry-to-SL distance is never thinner than this, in ATR. */
export const SD_MIN_RISK_ATR = 0.5;
/** Zones below this strength are not shown (weak zones tend to fail). */
export const SD_MIN_STRENGTH = 55;
/** An opposing FVG within this many ATR of the zone's proximal edge rejects it. */
export const SD_COUNTER_FVG_ATR = 3;
/** Strategy mode: the departure FVG's displacement candle must be within this many candles of the swing. */
export const SD_STRATEGY_FVG_BARS = 5;

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

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Deterministic strength: no single clue can reach STRONG on its own.
 * displacement (<=30) + outer extreme (<=20) + wick rejection (<=10) +
 * freshness (<=15) + structural label (<=10) + departure imbalance (<=15).
 */
export function zoneStrength(input: {
  displacementAtr: number;
  extreme: boolean;
  wickRatio: number;
  touches: number;
  extremeLabel: boolean;
  imbalance?: boolean;
}): { strength: number; grade: SdGrade } {
  const disp = Math.min(Math.max(input.displacementAtr, 0) / 2, 1) * 30;
  const ext = input.extreme ? 20 : 0;
  const wick = Math.min(Math.max(input.wickRatio, 0), 1) * 10;
  const fresh = input.touches === 0 ? 15 : input.touches === 1 ? 7 : 0;
  const lbl = input.extremeLabel ? 10 : 4;
  const imb = input.imbalance ? 15 : 0;
  const strength = Math.round(Math.min(100, disp + ext + wick + fresh + lbl + imb));
  const grade: SdGrade = strength >= 75 ? "EXTREME" : strength >= 55 ? "STRONG" : "MODERATE";
  return { strength, grade };
}

/**
 * @param bars closed candles, optionally followed by the forming candle.
 * @param pivots confirmed fractal pivots plus live (unconfirmed) swings, indexed into `bars`.
 * @param closedCount number of closed candles at the start of `bars` (defaults to all).
 *   Only closed candles can displace, break or test a zone, so ticks never flicker it.
 */
export function computeFreshZones(
  bars: Candle[],
  pivots: ZonePivot[],
  closedCount = bars.length,
  displacementWindow = 10,
  /** Strategy mode: hide zones without a same-direction departure FVG. */
  requireFvg = true,
): SdZone[] {
  if (bars.length < 20) return [];
  const zones: (SdZone & { broken?: boolean })[] = [];
  const last = Math.min(bars.length, closedCount) - 1;
  // Alive FVGs from closed candles only — used to reject zones that an
  // opposing gap is pushing into.
  const liveFvgs = detectLiveFvgs(bars.slice(0, last + 1));

  for (const p of pivots) {
    const i = p.index;
    const swing = bars[i];
    if (!swing || swing.t !== p.t) continue;
    const atr = atrAt(bars, i);
    if (!(atr > 0)) continue;
    const supply = p.kind === "high";

    // Displacement: how far closed bodies travelled away from the swing
    // candle's body edge (wicks never count as displacement).
    const bodyEdge = supply ? Math.max(swing.o, swing.c) : Math.min(swing.o, swing.c);
    const end = Math.min(last, i + displacementWindow);
    let far = bodyEdge;
    for (let k = i + 1; k <= end; k++) {
      far = supply ? Math.min(far, bars[k].c) : Math.max(far, bars[k].c);
    }
    const displacementAtr = Math.max(0, (supply ? bodyEdge - far : far - bodyEdge) / atr);
    const live = !!p.live;
    if (!live && displacementAtr < SD_MIN_DISPLACEMENT_ATR) continue;

    // Zone: swing candle body edge -> wick extreme, sized between 0.25 and 1 ATR.
    let depth = Math.abs(p.price - bodyEdge);
    depth = Math.min(Math.max(depth, atr * 0.25), atr);
    const top = supply ? p.price : p.price + depth;
    const bottom = supply ? p.price - depth : p.price;

    // Lifecycle: body close beyond the far edge kills the zone.
    let broken = false;
    let touches = 0;
    let inside = false;
    for (let k = i + 1; k <= last; k++) {
      const b = bars[k];
      if (supply ? b.c > top : b.c < bottom) {
        broken = true;
        break;
      }
      const touching = supply ? b.h >= bottom : b.l <= top;
      if (k > i + 1 && touching && !inside) touches++;
      inside = touching;
    }

    // Outer extreme: swing wick beyond every candle in the prior lookback
    // (fixed window before the swing, so it never changes later).
    let extreme = true;
    for (let k = Math.max(0, i - SD_EXTREME_LOOKBACK); k < i; k++) {
      if (supply ? bars[k].h >= p.price : bars[k].l <= p.price) {
        extreme = false;
        break;
      }
    }
    const range = Math.max(swing.h - swing.l, 1e-9);
    const wick = supply ? swing.h - Math.max(swing.o, swing.c) : Math.min(swing.o, swing.c) - swing.l;
    const extremeLabel = supply ? p.label === "HH" || p.label === "H" : p.label === "LL" || p.label === "L";
    // Departure FVG (strategy step 2): a same-direction 3-candle gap with a
    // real-bodied displacement candle inside the fixed window proves
    // institutional displacement off the zone. Zones without one are hidden.
    let departure: FreshFvg | undefined;
    // Strategy mode is strict: the displacement FVG must print right off the
    // swing (within SD_STRATEGY_FVG_BARS candles), not somewhere later.
    const fvgEnd = requireFvg ? Math.min(end, i + 1 + SD_STRATEGY_FVG_BARS) : end;
    for (let k = i + 1; k < fvgEnd; k++) {
      const a = bars[k - 1];
      const mid = bars[k];
      const c = bars[k + 1];
      if (!(supply ? c.h < a.l : c.l > a.h)) continue;
      const midRange = mid.h - mid.l;
      if (!(midRange > 0) || Math.abs(mid.c - mid.o) / midRange < FVG_MIN_BODY_RATIO) continue;
      if (supply ? mid.c >= mid.o : mid.c <= mid.o) continue;
      const fTop = supply ? a.l : c.l;
      const fBottom = supply ? c.h : a.h;
      const size = fTop - fBottom;
      if (size < atr * FVG_MIN_SIZE_ATR) continue;
      // Closed-candle lifecycle: fill depth only (the zone keeps its FVG).
      let deepest = supply ? fBottom : fTop;
      for (let m = k + 2; m <= last; m++) {
        deepest = supply ? Math.max(deepest, bars[m].h) : Math.min(deepest, bars[m].l);
      }
      const filled = Math.max(0, Math.min(1, (supply ? deepest - fBottom : fTop - deepest) / size));
      departure = {
        type: supply ? "BEARISH" : "BULLISH",
        t: mid.t,
        top: fTop,
        bottom: fBottom,
        fresh: filled === 0,
        filled: Math.round(filled * 100) / 100,
        sizeAtr: Math.round((size / atr) * 10) / 10,
      };
      break;
    }
    const imbalance = !!departure;
    const { strength, grade } = zoneStrength({
      displacementAtr,
      extreme,
      wickRatio: wick / range,
      touches,
      extremeLabel,
      imbalance,
    });

    // Opposing FVG printed after the zone on its side of price rejects it.
    const reach = atr * SD_COUNTER_FVG_ATR;
    const countered = liveFvgs.some((f) =>
      f.t > p.t &&
      (supply
        ? f.type === "BULLISH" && f.top <= top && f.top >= bottom - reach
        : f.type === "BEARISH" && f.bottom >= bottom && f.bottom <= top + reach),
    );

    const fresh = touches === 0;
    // Strategy step 3: price leaves the zone, prints the displacement FVG,
    // then comes back to retest that FVG. Entry is the FVG's near edge
    // (bullish FVG top for BUY, bearish FVG bottom for SELL), SL sits beyond
    // the zone's swing extreme with a gold buffer, TP1 = 2R, TP2 = 3R.
    // Without a departure FVG (strategy off) the entry stays on the zone edge.
    const entry = departure
      ? supply ? departure.bottom : departure.top
      : supply ? bottom : top;
    // SL beyond the swing extreme with a gold buffer; risk never thinner than
    // SD_MIN_RISK_ATR so spread/noise cannot stop a valid retest.
    let sl = supply ? p.price + atr * SD_SL_BUFFER_ATR : p.price - atr * SD_SL_BUFFER_ATR;
    if (Math.abs(entry - sl) < atr * SD_MIN_RISK_ATR) {
      sl = supply ? entry + atr * SD_MIN_RISK_ATR : entry - atr * SD_MIN_RISK_ATR;
    }
    const risk = Math.abs(entry - sl);
    // Structural target: the departure leg's extreme (the next major high for
    // BUY / low for SELL), fixed from closed candles. TP1 = 2R minimum;
    // TP2 = the larger of 3R and that structural target.
    let peak = supply ? Infinity : -Infinity;
    for (let k = i + 1; k <= last; k++) {
      peak = supply ? Math.min(peak, bars[k].l) : Math.max(peak, bars[k].h);
    }
    const r2 = supply ? entry - risk * 2 : entry + risk * 2;
    const r3 = supply ? entry - risk * 3 : entry + risk * 3;
    const tp1 = r2;
    const tp2 = Number.isFinite(peak) ? (supply ? Math.min(r3, peak) : Math.max(r3, peak)) : r3;
    // Strategy mode: a closed candle whose wick ran the stop means the setup
    // already failed, so the zone is not shown.
    let stopped = false;
    for (let k = i + 1; k <= last; k++) {
      if (supply ? bars[k].h >= sl : bars[k].l <= sl) {
        stopped = true;
        break;
      }
    }


    // Every zone carries its levels; only the newest kept zone shows them.
    const plan: SdTradePlan = {
      side: supply ? "SELL" : "BUY",
      entry: round(entry),
      sl: round(sl),
      tp1: round(tp1),
      tp2: round(tp2),
    };

    zones.push({
      type: supply ? "SUPPLY" : "DEMAND",
      t: p.t,
      top,
      bottom,
      label: p.label,
      fresh,
      touches,
      displacementAtr: Math.round(displacementAtr * 10) / 10,
      extreme,
      extremeLevel: p.price,
      live,
      imbalance,
      fvg: departure,
      strength,
      grade,
      plan,
      levels: plan,
      broken:
        broken ||
        countered ||
        (requireFvg && (!departure || stopped)) ||
        strength < SD_MIN_STRENGTH,
    } as SdZone & { broken: boolean });
  }

  // Newest first; newer zones win any overlap (same or opposite type). A zone
  // must also sit a clear gap away from every kept zone, so none ever stack.
  zones.sort((a, b) => b.t - a.t);
  const nowAtr = Math.max(0, atrAt(bars, Math.max(1, last)));
  const gap = nowAtr * SD_MIN_GAP_ATR;
  const supersede = nowAtr * SD_SUPERSEDE_ATR;
  // Keep the newest SD_MAX_TOTAL valid (unbroken, strong, not countered) zones: when a new zone
  // prints, the oldest kept one drops off. Broken zones never take a slot,
  // so strong trends no longer leave the chart empty.
  const kept: SdZone[] = [];
  for (const z of zones) {
    if (z.broken) continue;
    // A newer zone printed on top of an older one replaces it: the old zone
    // hides and the fresh one shows.
    if (kept.some((k) => k.type === z.type && z.bottom - supersede < k.top && z.top + supersede > k.bottom)) continue;
    if (kept.some((k) => z.bottom - gap < k.top && z.top + gap > k.bottom)) continue;
    const { broken: _b, ...clean } = z;
    kept.push(clean);
    if (kept.length >= SD_MAX_TOTAL) break;
  }
  kept.sort((a, b) => a.t - b.t);
  // Entry / SL / TP always belong to the latest zone on the chart.
  const newest = kept[kept.length - 1];
  return kept.map((z) => (z === newest ? z : { ...z, plan: undefined }));
}
