/**
 * Fresh supply & demand zones built from confirmed 10-bar fractal swings.
 *
 * Every new confirmed swing high can create a SUPPLY zone and every swing low
 * a DEMAND zone, but only when price displaced away from the swing by closed
 * candle bodies (>= 1 ATR within the fractal confirmation window). Zones are
 * anchored to the swing candle (body edge → wick) so they never move once
 * printed. A closed candle beyond the far edge deletes the zone; a wick back
 * into it marks the zone as tested (no longer fresh).
 */
import type { StructurePivot } from "@/lib/analysis/market-structure-evidence";

type Candle = { t: number; o: number; h: number; l: number; c: number };

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
  /** True for fresh extremes (HH at highs, LL at lows). */
  extreme: boolean;
};

export const SD_MIN_DISPLACEMENT_ATR = 1;
export const SD_MAX_PER_SIDE = 3;

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

/**
 * @param bars closed candles only (the same window used to detect `pivots`).
 * @param pivots confirmed fractal pivots indexed into `bars`.
 * @param displacementWindow closed candles after the swing used to measure displacement.
 */
export function computeFreshZones(
  bars: Candle[],
  pivots: StructurePivot[],
  displacementWindow = 10,
): SdZone[] {
  if (bars.length < 20) return [];
  const zones: SdZone[] = [];
  const last = bars.length - 1;

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
    const displacementAtr = (supply ? bodyEdge - far : far - bodyEdge) / atr;
    if (displacementAtr < SD_MIN_DISPLACEMENT_ATR) continue;

    // Zone: swing candle body edge → wick extreme, sized between 0.25 and 1 ATR.
    let depth = Math.abs(p.price - bodyEdge);
    depth = Math.min(Math.max(depth, atr * 0.25), atr);
    const top = supply ? p.price : p.price + depth;
    const bottom = supply ? p.price - depth : p.price;

    // Lifecycle after formation: body close beyond the far edge kills the zone.
    let broken = false;
    let touches = 0;
    let inside = false;
    for (let k = i + 1; k <= last; k++) {
      const b = bars[k];
      if (supply ? b.c > top : b.c < bottom) {
        broken = true;
        break;
      }
      // Only count touches once price has left the zone at least once.
      const touching = supply ? b.h >= bottom : b.l <= top;
      if (k > i + 1 && touching && !inside) touches++;
      inside = touching;
    }
    if (broken) continue;

    zones.push({
      type: supply ? "SUPPLY" : "DEMAND",
      t: p.t,
      top,
      bottom,
      label: p.label,
      fresh: touches === 0,
      touches,
      displacementAtr: Math.round(displacementAtr * 10) / 10,
      extreme: supply ? p.label === "HH" || p.label === "H" : p.label === "LL" || p.label === "L",
    });
  }

  // Newer zones win overlaps with older zones of the same type.
  const pick = (type: SdZone["type"]) => {
    const list = zones.filter((z) => z.type === type).sort((a, b) => b.t - a.t);
    const kept: SdZone[] = [];
    for (const z of list) {
      if (kept.some((k) => z.bottom <= k.top && z.top >= k.bottom)) continue;
      kept.push(z);
      if (kept.length >= SD_MAX_PER_SIDE) break;
    }
    return kept;
  };
  const supplies = pick("SUPPLY");
  const demands = pick("DEMAND");
  // Opposite zones never overlap: keep the newer one.
  const out = [...supplies];
  for (const d of demands) {
    const clash = out.find((s) => d.bottom <= s.top && d.top >= s.bottom);
    if (!clash) out.push(d);
    else if (d.t > clash.t) out.splice(out.indexOf(clash), 1, d);
  }
  return out.sort((a, b) => a.t - b.t);
}
