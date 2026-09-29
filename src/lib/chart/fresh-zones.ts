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
 * - Only the newest SD_MAX_TOTAL zones are returned, so older zones hide as new
 *   ones form.
 */
import type { StructurePivot } from "@/lib/analysis/market-structure-evidence";

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
  /** Deterministic 0-100 strength score. */
  strength: number;
  grade: SdGrade;
  /** Entry / SL / TP levels — kept only on the latest zone. */
  plan?: SdTradePlan;
};

export type ZonePivot = Pick<StructurePivot, "index" | "t" | "price" | "kind" | "label"> & { live?: boolean };

/** Confirmed swings need this much closed-body displacement to keep a zone. */
export const SD_MIN_DISPLACEMENT_ATR = 0.5;
/** Newest zones shown on the chart (both sides together). */
export const SD_MAX_TOTAL = 4;
/** Minimum clear gap between any two kept zones, in current ATR, so they never stack. */
export const SD_MIN_GAP_ATR = 0.3;
export const SD_EXTREME_LOOKBACK = 50;
export const SD_SL_BUFFER_ATR = 0.15;

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
 * displacement (<=35) + outer extreme (<=25) + wick rejection (<=15) +
 * freshness (<=15) + structural label (<=10).
 */
export function zoneStrength(input: {
  displacementAtr: number;
  extreme: boolean;
  wickRatio: number;
  touches: number;
  extremeLabel: boolean;
}): { strength: number; grade: SdGrade } {
  const disp = Math.min(Math.max(input.displacementAtr, 0) / 2, 1) * 35;
  const ext = input.extreme ? 25 : 0;
  const wick = Math.min(Math.max(input.wickRatio, 0), 1) * 15;
  const fresh = input.touches === 0 ? 15 : input.touches === 1 ? 7 : 0;
  const lbl = input.extremeLabel ? 10 : 4;
  const strength = Math.round(Math.min(100, disp + ext + wick + fresh + lbl));
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
): SdZone[] {
  if (bars.length < 20) return [];
  const zones: SdZone[] = [];
  const last = Math.min(bars.length, closedCount) - 1;

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
    if (broken) continue;

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
    const { strength, grade } = zoneStrength({
      displacementAtr,
      extreme,
      wickRatio: wick / range,
      touches,
      extremeLabel,
    });

    const fresh = touches === 0;
    // Limit-order levels: entry at the proximal edge, SL beyond the extreme.
    const entry = supply ? bottom : top;
    const sl = supply ? p.price + atr * SD_SL_BUFFER_ATR : p.price - atr * SD_SL_BUFFER_ATR;
    const risk = Math.abs(entry - sl);
    const tp1 = supply ? entry - risk * 2 : entry + risk * 2;
    const tp2 = supply ? entry - risk * 3 : entry + risk * 3;

    // Once price trades back to the entry the zone is no longer fresh, so a
    // played-out trade never keeps its Entry/SL/TP lines; the zone itself stays.

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
      strength,
      grade,
      plan,
    });
  }

  // Newest first; newer zones win any overlap (same or opposite type). A zone
  // must also sit a clear gap away from every kept zone, so none ever stack.
  zones.sort((a, b) => b.t - a.t);
  const gap = Math.max(0, atrAt(bars, Math.max(1, last))) * SD_MIN_GAP_ATR;
  const kept: SdZone[] = [];
  for (const z of zones) {
    if (kept.some((k) => z.bottom - gap < k.top && z.top + gap > k.bottom)) continue;
    kept.push(z);
    if (kept.length >= SD_MAX_TOTAL) break;
  }
  kept.sort((a, b) => a.t - b.t);
  // Entry / SL / TP always belong to the latest zone on the chart.
  const newest = kept[kept.length - 1];
  return kept.map((z) => (z === newest ? z : { ...z, plan: undefined }));
}
