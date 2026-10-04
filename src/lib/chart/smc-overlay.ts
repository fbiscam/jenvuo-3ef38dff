/**
 * Jenvu SMC overlays for the chart. Uses exactly the same deterministic
 * engines and the same 400-closed-candle structure window as the Terminal AI evidence,
 * so what the user sees on the chart is what the AI verifies.
 */
import {
  detectMarketStructureEvidence,
  type StructureBreak,
  type StructurePivot,
} from "@/lib/analysis/market-structure-evidence";
import {
  detectPoiEvidence,
  type FairValueGap,
  type OrderBlockZone,
} from "@/lib/analysis/poi-evidence";
import type { OhlcvBar } from "./indicators";
import { computeFreshZones, type SdZone } from "./fresh-zones";
import { computeLiquidityMap, type LiquidityMap } from "./liquidity-sweeps";
import { computeFreshFvgs, FVG_MAX_TOTAL, type FreshFvg } from "./fresh-fvgs";

/** Zone + FVG strategy: only the single latest zone (with its own displacement FVG and plan) is shown. */
export const SD_VISIBLE_ZONES = 1;

/**
 * Newest wins across supply/demand zones AND standalone FVGs: any older zone
 * or FVG that a newer one prints on top of is hidden. A zone's own
 * displacement FVG never hides it. FVGs are capped to the newest `maxFvg`
 * survivors, zones to the newest `maxZones`, and Entry/SL/TP move to the
 * newest surviving zone.
 */

/** Label plate colours follow the terminal theme (black theme = dark plates). */
function isDarkCanvas(ctx: CanvasRenderingContext2D): boolean {
  const c = ctx.canvas as HTMLCanvasElement;
  return typeof c.closest === "function" && !!c.closest(".terminal-dark");
}
function plate(ctx: CanvasRenderingContext2D, alpha = 0.92): string {
  return isDarkCanvas(ctx) ? `rgba(24,24,24,${alpha})` : `rgba(255,255,255,${alpha})`;
}

export function resolveZoneOverlaps(
  sdZones: SdZone[],
  fvgs: FreshFvg[],
  maxFvg = FVG_MAX_TOTAL,
  maxZones = SD_VISIBLE_ZONES,
): { sdZones: SdZone[]; fvgs: FreshFvg[] } {
  type Item = { t: number; top: number; bottom: number; sd?: SdZone; fvg?: FreshFvg };
  const paired = new Set(sdZones.filter((z) => z.fvg).map((z) => `${z.fvg!.type}:${z.fvg!.t}`));
  const items: Item[] = [
    ...sdZones.map((z) => ({ t: z.t, top: z.top, bottom: z.bottom, sd: z })),
    ...fvgs
      .filter((f) => !paired.has(`${f.type}:${f.t}`))
      .map((f) => ({ t: f.t, top: f.top, bottom: f.bottom, fvg: f })),
  ].sort((a, b) => b.t - a.t);
  const kept: Item[] = [];
  let fvgCount = 0;
  for (const it of items) {
    if (it.fvg && fvgCount >= maxFvg) continue;
    if (kept.some((k) => it.bottom < k.top && it.top > k.bottom)) continue;
    kept.push(it);
    if (it.fvg) fvgCount++;
  }
  const keptSd = kept
    .filter((k) => k.sd)
    .map((k) => k.sd!)
    .sort((a, b) => a.t - b.t)
    .slice(-maxZones);
  const newest = keptSd[keptSd.length - 1];
  return {
    sdZones: keptSd.map((z) =>
      z === newest ? { ...z, plan: z.plan ?? z.levels } : { ...z, plan: undefined },
    ),
    fvgs: kept.filter((k) => k.fvg).map((k) => k.fvg!).sort((a, b) => a.t - b.t),
  };
}

/** Sweeps below this strength are not drawn. */
const LIQ_MIN_DRAWN_SWEEP = 40;

export const SMC_WINDOW = 150;
/** HH/HL/LH/LL chart labels use a Fractals-style swing length of 10 bars each side. */
export const FRACTAL_RADIUS = 10;
/** Closed bars scanned for 10-bar fractal labels (wider window so enough swings form). */
export const FRACTAL_WINDOW = 400;

export type LivePivot = {
  t: number;
  price: number;
  kind: "high" | "low";
  label: "H" | "L" | "HH" | "HL" | "LH" | "LL";
  /** True when the swing sits on the still-forming candle. */
  onFormingCandle: boolean;
  /** Candles printed after the swing so far (needs FRACTAL_RADIUS to confirm). */
  barsAfter: number;
  confirmIn: number;
  /** Locked early because the opposite swing already formed after it. */
  confirmedByOpposite?: boolean;
  /** A candle CLOSE beyond this level (above for a low, below for a high) locks the swing early. */
  earlyLevel?: number;
  /** 0–100 likelihood the swing holds until confirmation. */
  confirmChance?: number;
  /** Epoch ms when the last required candle closes. */
  confirmAt?: number;
};

export type SmcOverlay = {
  pivots: StructurePivot[];
  livePivots: LivePivot[];
  breaks: Array<StructureBreak & { fromT: number }>;
  fvgs: FairValueGap[];
  orderBlocks: OrderBlockZone[];
  buySide: number[];
  sellSide: number[];
  trend: string;
  windowStart: number | null;
  /** Buyer % (0-100) for the leg that built each swing, keyed by pivot time. */
  pressure?: Record<number, number>;
  /** Latest reversal setup at the newest swing (alert → confirmed → cancelled). */
  reversal?: ReversalSignal | null;
  /** Fresh supply/demand zones anchored to confirmed swing highs/lows. */
  sdZones?: SdZone[];
  /** Strategy zones: only swings followed by a same-direction displacement FVG. */
  sdStrategyZones?: SdZone[];
  /** Previous 10 Zone + FVG strategy zones (newest first) with their end time. */
  sdHistoryZones?: SdZone[];
  /** Resting liquidity pools (next sweep targets) and confirmed sweeps. */
  liquidityMap?: LiquidityMap;
  /** Fresh bullish / bearish FVGs from closed candles (newest few). */
  freshFvgs?: FreshFvg[];
};

export type ReversalSignal = {
  side: "buy" | "sell";
  /** Swing candle time (ms) and extreme price. */
  t: number;
  pivotPrice: number;
  label: string;
  stage: "alert" | "confirmed" | "cancelled";
  /** 0–100 strength estimate (not a guarantee). */
  score: number;
  swept: boolean;
  entry: number | null;
  entryT: number | null;
  sl: number;
  tp1: number | null;
  tp2: number | null;
};

type PCandle = { t: number; o: number; h: number; l: number; c: number };

/**
 * Reversal setup on the newest swing:
 *  - alert: a fresh swing extreme exists (sweep / rejection / pressure scored)
 *  - confirmed: candle 1 body-closes beyond the swing candle's body, then candle 2
 *    retests/holds that level and closes in the reversal direction
 *  - cancelled: price trades beyond the swing extreme afterwards
 * Entry = confirmation close, SL = beyond wick (+ small ATR buffer), TP1 = opposing liquidity, TP2 = 1:3.
 */
export function computeReversalSignal(
  closed: PCandle[],
  forming: PCandle | null,
  swings: Array<{ t: number; price: number; kind: "high" | "low"; label: string }>,
  pressure: Record<number, number>,
  atr: number,
  buySide: number[],
  sellSide: number[],
): ReversalSignal | null {
  if (!swings.length || !closed.length) return null;
  const last = [...swings].sort((a, b) => a.t - b.t).at(-1)!;
  const all = forming ? [...closed, forming] : closed;
  const i = all.findIndex((c) => c.t === last.t);
  if (i < 0) return null;
  const high = last.kind === "high";
  const piv = all[i];
  const prior = swings.filter((s) => s.kind === last.kind && s.t < last.t).sort((a, b) => b.t - a.t)[0];
  const swept = !!prior && (high ? last.price > prior.price : last.price < prior.price);
  const buyPct = pressure[last.t] ?? 50;
  const winPct = high ? 100 - buyPct : buyPct;
  const pressureAligned = winPct > 55;
  // Keep one confidence source everywhere: the confluence-gated pressure
  // calculated by reversalPressureStrength. A separate wick/sweep formula
  // could otherwise advertise a stronger setup than the chart badge.
  const score = winPct;
  const buffer = Math.max(atr * 0.1, last.price * 0.00003);
  const sl = high ? last.price + buffer : last.price - buffer;
  let stage: ReversalSignal["stage"] = "alert";
  let entry: number | null = null;
  let entryT: number | null = null;
  const trigger = high ? Math.min(piv.o, piv.c) : Math.max(piv.o, piv.c);
  let breakIndex = -1;
  for (let k = i + 1; k < all.length; k++) {
    const c = all[k];
    if (high ? c.h > last.price : c.l < last.price) { stage = "cancelled"; break; }
    const isClosed = k < closed.length;
    if (!isClosed) continue;
    if (breakIndex < 0 && (high ? c.c < trigger : c.c > trigger)) {
      breakIndex = k;
      continue;
    }
    if (breakIndex >= 0 && k === breakIndex + 1) {
      const tolerance = Math.max(atr * 0.2, last.price * 0.00002);
      const retested = high ? c.h >= trigger - tolerance : c.l <= trigger + tolerance;
      const held = high ? c.c < trigger : c.c > trigger;
      const directionalClose = high ? c.c < c.o : c.c > c.o;
      if (retested && held && directionalClose && pressureAligned) {
        entry = c.c;
        entryT = c.t;
        stage = "confirmed";
      } else {
        breakIndex = -1;
      }
    }
  }
  const ref = entry ?? (forming?.c ?? closed.at(-1)!.c);
  const risk = Math.abs(ref - sl);
  const tp2 = risk > 0 ? (high ? ref - 3 * risk : ref + 3 * risk) : null;
  const liquidityTarget = high
    ? sellSide.find((p) => p < ref - risk && (tp2 == null || p > tp2))
    : buySide.find((p) => p > ref + risk && (tp2 == null || p < tp2));
  // TP1 must remain visible even when no clean opposing liquidity pivot exists.
  // Prefer that liquidity; otherwise use a deterministic 1.5R partial target.
  const tp1 = risk > 0
    ? liquidityTarget ?? (high ? ref - 1.5 * risk : ref + 1.5 * risk)
    : null;
  return { side: high ? "sell" : "buy", t: last.t, pivotPrice: last.price, label: last.label, stage, score, swept, entry, entryT, sl, tp1, tp2 };
}
/** Buyer share of the leg ending at `end`: close position inside each candle's range. */
export function legBuyerPercent(candles: PCandle[], start: number, end: number): number | null {
  let buy = 0;
  let total = 0;
  for (let i = Math.max(0, start); i <= Math.min(end, candles.length - 1); i++) {
    const k = candles[i];
    const range = k.h - k.l;
    if (!(range > 0)) continue;
    buy += k.c - k.l;
    total += range;
  }
  return total > 0 ? Math.round((buy / total) * 100) : null;
}

export type SmcToggles = {
  structure: boolean;
  pressure: boolean;
  breaks: boolean;
  fvg: boolean;
  orderBlocks: boolean;
  liquidity: boolean;
  projection: boolean;
  sdZones: boolean;
  /** Zone + FVG strategy: latest 2 zones confirmed by a displacement FVG. */
  sdStrategy?: boolean;
  /** Previous 10 strategy zones + their FVGs (15m and higher only). */
  sdHistory?: boolean;
  /** Entry / SL / TP lines on the newest fresh supply/demand zone. */
  sdPlan: boolean;
  /** Liquidity sweep indicator: EQH/EQL pools, next sweep targets, sweeps. */
  sweeps: boolean;
  /** Fresh bullish / bearish FVG indicator (closed-candle lifecycle). */
  freshFvg: boolean;
};

export const DEFAULT_SMC: SmcToggles = {
  structure: true,
  pressure: true,
  breaks: true,
  fvg: false,
  orderBlocks: false,
  liquidity: true,
  projection: true,
  sdZones: true,
  sdStrategy: true,
  sdHistory: false,
  sdPlan: true,
  sweeps: true,
  freshFvg: true,
};

type Candle = { t: number; o: number; h: number; l: number; c: number; v?: number };

export type ReversalPressureEvidence = {
  directionalAgreement: number;
  displacement: number;
  footprint: number;
  confirmation: number;
  followThrough: number;
  streak: number;
  evidence: number;
  directionalBias: number;
  efficiency: number;
  persistence: number;
  /** 0..1 location quality in the recent dealing range (1 = extreme premium for highs / discount for lows). */
  context?: number;
  /** True once a later closed candle closes beyond the swing extreme. */
  invalidated?: boolean;
};

/**
 * Converts independent reversal evidence into distance from neutral (0..0.46).
 * A high score requires footprint, confirmation and follow-through to agree;
 * one dramatic wick or volume spike can no longer create a high percentage.
 */
export function reversalPressureStrength(input: ReversalPressureEvidence): number {
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const footprint = clamp01(input.footprint);
  const confirmation = clamp01(input.confirmation);
  const followThrough = clamp01(input.followThrough);
  const displacement = clamp01(input.displacement);
  const streak = clamp01(input.streak);
  const evidence = clamp01(input.evidence);
  const directionalBias = clamp01(input.directionalBias);
  const efficiency = clamp01(input.efficiency);
  const persistence = clamp01(input.persistence);
  const agreement = Math.max(0, input.directionalAgreement);

  // Optional location context: highs in premium / lows in discount of the
  // recent dealing range. Undefined = legacy neutral behaviour.
  const context = input.context == null ? null : clamp01(input.context);
  const coreStrong = [footprint, confirmation, followThrough]
    .filter((value) => value >= 0.55).length;
  const strongFamilies = coreStrong;
  const weakestCore = Math.min(footprint, confirmation, followThrough);
  const weightedConfluence =
    0.24 * footprint + 0.31 * confirmation + 0.29 * followThrough +
    0.1 * displacement + 0.06 * streak;

  // Contradictory order flow and choppy price action actively reduce the score.
  const directionalConflict = clamp01((0.5 - directionalBias) * 2);
  const chop = evidence >= 0.3
    ? 0.55 * (1 - efficiency) + 0.45 * (1 - persistence)
    : 0;
  const contradiction = 0.1 * directionalConflict + 0.055 * chop;

  let strength =
    0.025 + 0.22 * agreement + 0.08 * displacement +
    0.19 * weightedConfluence + 0.08 * weakestCore - contradiction;
  if (context != null) strength += 0.04 * (context - 0.5);

  // Strict confidence ceilings stop a single signal from looking trade-ready.
  // The top tier additionally requires a favourable range location.
  let familyCap = strongFamilies === 3 ? 0.46 : strongFamilies === 2 ? 0.34 : strongFamilies === 1 ? 0.24 : 0.17;
  if (strongFamilies === 3 && context != null && context < 0.55) familyCap = 0.4;
  const maturityCap = 0.2 + 0.26 * evidence;
  strength = Math.min(strength, familyCap, maturityCap);
  // A swing whose extreme has been closed through is invalidated.
  if (input.invalidated) strength = Math.min(strength, 0.08);
  return Math.max(0.03, Math.min(0.46, strength));
}

type PoiSelection = {
  fvgs: FairValueGap[];
  orderBlocks: OrderBlockZone[];
};

const zoneDistance = (top: number, bottom: number, price: number) => {
  if (price >= bottom && price <= top) return 0;
  return Math.min(Math.abs(price - top), Math.abs(price - bottom));
};

/**
 * Keeps only the strongest untouched POI in each direction. This prevents two
 * same-side zones from stacking over each other while retaining the most
 * actionable high-confidence demand, supply and FVG around current price.
 */
export function selectHighConfidencePois(
  poi: Pick<ReturnType<typeof detectPoiEvidence>, "fair_value_gaps" | "order_blocks">,
  price: number,
): PoiSelection {
  const chooseOnePerType = <T extends { type: string; index: number; top: number; bottom: number }>(
    zones: T[],
    score: (zone: T) => number,
  ) => {
    const best = new Map<string, T>();
    for (const zone of zones) {
      const current = best.get(zone.type);
      if (!current || score(zone) > score(current)) best.set(zone.type, zone);
    }
    return [...best.values()].sort((a, b) => a.index - b.index);
  };

  const untouchedFvgs = poi.fair_value_gaps.filter((gap) => gap.status === "UNMITIGATED");
  const averageFvgSize =
    untouchedFvgs.reduce((total, gap) => total + gap.size, 0) / Math.max(1, untouchedFvgs.length);
  const meaningfulFvgs = untouchedFvgs.filter((gap) => gap.size >= averageFvgSize);
  // Scores depend only on closed-candle facts (never live price) so the chosen
  // zone stays fixed while the forming candle moves instead of flickering.
  const fvgs = chooseOnePerType(
    meaningfulFvgs,
    (gap) => (gap.size / Math.max(averageFvgSize, Number.EPSILON)) * 100 + gap.index,
  );

  const activeOrderBlocks = poi.order_blocks.filter((zone) => zone.status !== "MITIGATED");
  const orderBlocks = chooseOnePerType(
    activeOrderBlocks,
    (zone) =>
      (zone.displacement ? 400 : 0) +
      (zone.swept_liquidity ? 300 : 0) +
      (zone.is_fvg_aligned ? 300 : 0) +
      (zone.status === "UNMITIGATED" ? 200 : 0) +
      zone.index,
  );

  // Never let markings sit on top of each other: keep order blocks first
  // (supply before demand by score), then FVGs that don't overlap any kept zone.
  const pad = Math.max(price * 0.0002, 0.1);
  const kept: { top: number; bottom: number }[] = [];
  const free = (z: { top: number; bottom: number }) =>
    kept.every((k) => z.bottom - pad >= k.top || z.top + pad <= k.bottom);
  const keepIfFree = <T extends { top: number; bottom: number }>(z: T) => {
    if (!free(z)) return false;
    kept.push(z);
    return true;
  };
  const obsOut = orderBlocks.filter(keepIfFree);
  const fvgsOut = fvgs.filter(keepIfFree);
  return { fvgs: fvgsOut, orderBlocks: obsOut };
}

const toCandle = (b: OhlcvBar): Candle => ({ t: b.time * 1000, o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume });
// Only final, confirmed HH/HL/LH/LL labels render — no dashed provisional labels or countdown trackers.
const SHOW_PROVISIONAL_PIVOTS = false;
const lockedLabels = new Map<string, string>();
type StructureMemory = {
  pivots: Map<string, StructurePivot>;
  breaks: Map<string, StructureBreak & { fromT: number; fromKind: "high" | "low" }>;
};
/** Per-series (asset + timeframe) memory of confirmed swings and breaks. */
const structureMemory = new Map<string, StructureMemory>();
function memoryFor(key: string): StructureMemory {
  let m = structureMemory.get(key);
  if (!m) {
    m = { pivots: new Map(), breaks: new Map() };
    structureMemory.set(key, m);
  }
  if (m.pivots.size > 3000) m.pivots.delete(m.pivots.keys().next().value as string);
  if (m.breaks.size > 1000) m.breaks.delete(m.breaks.keys().next().value as string);
  return m;
}

/**
 * Provisional swings in the unconfirmed tail: a candle whose high (low) beats
 * the previous FRACTAL_RADIUS candles and every candle printed after it so far,
 * including the forming one. It updates live as the current candle moves and
 * becomes a confirmed pivot once FRACTAL_RADIUS later candles close.
 */
export function computeLivePivots(
  closed: Candle[],
  forming: Candle | null,
  confirmed: StructurePivot[],
  radius = FRACTAL_RADIUS,
): LivePivot[] {
  const all = forming ? [...closed, forming] : closed;
  const firstUnconfirmed = Math.max(radius, closed.length - radius);
  const out: LivePivot[] = [];
  for (const kind of ["high", "low"] as const) {
    const val = (c: Candle) => (kind === "high" ? c.h : c.l);
    const beats = (a: number, b: number) => (kind === "high" ? a > b : a < b);
    // Pick the most extreme candle in the unconfirmed tail (latest wins ties),
    // so the newest low/high — including the forming candle — always gets its label.
    let best = -1;
    for (let i = firstUnconfirmed; i < all.length; i++) {
      if (best < 0 || !beats(val(all[best]), val(all[i]))) best = i;
    }
    for (let i = best; i >= 0 && i === best; i--) {
      const v = val(all[i]);
      let ok = true;
      for (let k = Math.max(0, i - radius); k < i && ok; k++) if (beats(val(all[k]), v)) ok = false;
      if (!ok) continue;
      const prev = [...confirmed].reverse().find((p) => p.kind === kind);
      const label: LivePivot["label"] = !prev
        ? kind === "high"
          ? "H"
          : "L"
        : kind === "high"
          ? v > prev.price
            ? "HH"
            : "LH"
          : v < prev.price
            ? "LL"
            : "HL";
      out.push({
        t: all[i].t,
        price: v,
        kind,
        label,
        onFormingCandle: forming != null && i === all.length - 1,
        barsAfter: all.length - 1 - i,
        // Closed candles still needed after this swing before it locks in.
        confirmIn: Math.max(0, radius - Math.max(0, closed.length - 1 - i)),
      });
      break;
    }
  }
  // Structural confirmation: once the opposite swing has printed AFTER a live
  // pivot (e.g. high → new low → price moved up), the earlier swing is locked
  // in immediately — no need to wait for the full 10 candles.
  const hi = out.find((p) => p.kind === "high");
  const lo = out.find((p) => p.kind === "low");
  // Heavy confirmation read: early-lock level, hold probability and ETA.
  const step = closed.length > 1 ? closed[closed.length - 1].t - closed[closed.length - 2].t : 0;
  const trs = closed.slice(-14).map((c, k, a) => Math.max(c.h - c.l, k ? Math.abs(c.h - a[k - 1].c) : 0, k ? Math.abs(c.l - a[k - 1].c) : 0));
  const atr = trs.length ? trs.reduce((x, y) => x + y, 0) / trs.length : 0;
  const last = all[all.length - 1];
  for (const p of out) {
    const idx = all.findIndex((c) => c.t === p.t);
    const piv = all[idx];
    const isHigh = p.kind === "high";
    // Early lock: close through the swing candle's opposite extreme (displacement away).
    p.earlyLevel = isHigh ? piv.l : piv.h;
    const lastClosedT = closed.length ? closed[closed.length - 1].t : piv.t;
    p.confirmAt = step > 0 ? lastClosedT + step * (p.confirmIn + (forming ? 1 : 0)) : undefined;
    const dist = atr > 0 ? Math.abs(last.c - p.price) / atr : 0;
    const wick = piv.h - piv.l > 0 ? (isHigh ? piv.h - Math.max(piv.o, piv.c) : Math.min(piv.o, piv.c) - piv.l) / (piv.h - piv.l) : 0;
    const done = (radius - p.confirmIn) / radius;
    const early = isHigh ? last.c < p.earlyLevel : last.c > p.earlyLevel;
    let chance = 25 + done * 35 + Math.min(1, dist / 2) * 25 + wick * 10 + (early ? 10 : 0);
    if (p.onFormingCandle) chance = Math.min(chance, 40);
    p.confirmChance = Math.round(Math.max(5, Math.min(97, chance)));
  }
  if (hi && lo && hi.t !== lo.t) {
    const [earlier, later] = hi.t < lo.t ? [hi, lo] : [lo, hi];
    if (later.barsAfter >= 1) {
      earlier.confirmIn = 0;
      earlier.confirmedByOpposite = true;
      earlier.confirmChance = 100;
    }
  }
  return out;
}

/**
 * `bars` must be closed candles only (the forming candle excluded); pass the
 * forming candle separately so live HH/HL/LH/LL labels can follow it.
 */
export function computeSmcOverlay(
  bars: OhlcvBar[],
  currentPrice: number | null,
  forming: OhlcvBar | null = null,
  opts: { useVolume?: boolean; seriesKey?: string } = {},
): SmcOverlay {
  // Gold spot has no central volume; different feeds report different (or zero)
  // tick volume, so volume-weighting made the same swing score differently.
  const useVolume = opts.useVolume ?? true;
  if (!useVolume) bars = bars.map((b) => ({ ...b, volume: 0 }));
  if (!useVolume && forming) forming = { ...forming, volume: 0 };
  const recent = bars.slice(-SMC_WINDOW).map(toCandle);
  if (recent.length < 10) {
    return {
      pivots: [],
      livePivots: [],
      breaks: [],
      fvgs: [],
      orderBlocks: [],
      buySide: [],
      sellSide: [],
      trend: "undecided",
      windowStart: null,
    };
  }
  const poi = detectPoiEvidence(recent);
  const price = currentPrice ?? recent[recent.length - 1].c;

  // HH/HL/LH/LL labels: 10-bar fractal swings (like the Fractals indicator).
  const fractalBars = bars.slice(-FRACTAL_WINDOW).map(toCandle);
  const fractal = detectMarketStructureEvidence(fractalBars, FRACTAL_RADIUS);
  // Final-once: a confirmed swing keeps the first label it received on its own
  // candle forever — later window shifts can never rename or move it.
  const lockLabel = <T extends { t: number; kind: string; price: number; label: string }>(p: T): T => {
    const key = `${p.kind}:${p.t}:${p.price}`;
    const locked = lockedLabels.get(key);
    if (locked) return { ...p, label: locked };
    lockedLabels.set(key, p.label);
    if (lockedLabels.size > 5000) lockedLabels.delete(lockedLabels.keys().next().value as string);
    return p;
  };
  // Historical structure is frozen: once a swing or break is confirmed on a
  // candle it stays on that candle with the same label, even if a later window
  // shift or price rescale would re-derive it differently. Only live swings move.
  const mem = opts.seriesKey ? memoryFor(opts.seriesKey) : null;
  const barIdx = new Map(fractalBars.map((b, k) => [b.t, k] as const));
  if (mem) {
    for (const p of fractal.pivots) {
      const key = `${p.kind}:${p.t}`;
      const prev = mem.pivots.get(key);
      if (prev) p.label = prev.label;
      else mem.pivots.set(key, { ...p });
    }
    const have = new Set(fractal.pivots.map((p) => `${p.kind}:${p.t}`));
    for (const [key, p] of mem.pivots) {
      const i = barIdx.get(p.t);
      if (i == null || have.has(key)) continue;
      // Same swing re-detected on a neighbouring candle: keep one label only.
      if (fractal.pivots.some((q) => q.kind === p.kind && Math.abs(q.index - i) < FRACTAL_RADIUS)) continue;
      const c = fractalBars[i];
      fractal.pivots.push({ ...p, index: i, confirmedIndex: Math.min(fractalBars.length - 1, i + FRACTAL_RADIUS), price: p.kind === "high" ? c.h : c.l });
    }
    fractal.pivots.sort((a, b) => a.index - b.index || (a.kind === "high" ? -1 : 1));
  }
  const pivotsLabelled = fractal.pivots.filter((p) => p.label.length === 2).map(lockLabel);
  const livePivots = computeLivePivots(fractalBars, forming ? toCandle(forming) : null, fractal.pivots)
    .map((p) => (p.confirmedByOpposite && p.label.length === 2 ? lockLabel(p) : p))
    .filter((p) => !pivotsLabelled.some((q) => q.kind === p.kind && q.t === p.t));
  const selectedPois = selectHighConfidencePois(poi, price);

  // Structure labels, breaks, trend and liquidity must all come from this same
  // confirmed 10-bar pivot set. Provisional tail pivots never create events.
  const breaks = fractal.breaks.map((b) => {
    const src = [...fractal.pivots]
      .reverse()
      .find((p) => p.index < b.index && Math.abs(p.price - b.level) < 1e-9);
    return { ...b, fromT: src?.t ?? fractalBars[Math.max(0, b.index - FRACTAL_RADIUS)].t };
  });
  if (mem) {
    const have = new Set(breaks.map((b) => `${b.dir}:${b.t}`));
    for (const b of breaks) {
      const key = `${b.dir}:${b.t}`;
      const prev = mem.breaks.get(key);
      if (prev) b.type = prev.type;
      else mem.breaks.set(key, { ...b, fromKind: b.dir === "bullish" ? "high" : "low" });
    }
    for (const [key, b] of mem.breaks) {
      const i = barIdx.get(b.t);
      const fi = barIdx.get(b.fromT);
      if (i == null || fi == null || have.has(key)) continue;
      const src = fractalBars[fi];
      const { fromKind, ...rest } = b;
      breaks.push({ ...rest, index: i, level: fromKind === "high" ? src.h : src.l });
    }
    breaks.sort((a, b) => a.index - b.index);
  }
  const buySide = Array.from(
    new Set(fractal.pivots.filter((p) => p.kind === "high" && p.price > price).map((p) => p.price)),
  )
    .sort((a, b) => a - b)
    .slice(0, 4);
  const sellSide = Array.from(
    new Set(fractal.pivots.filter((p) => p.kind === "low" && p.price < price).map((p) => p.price)),
  )
    .sort((a, b) => b - a)
    .slice(0, 4);
  const all = forming ? [...fractalBars, toCandle(forming)] : fractalBars;
  const pressure: Record<number, number> = {};
  const idxOf = new Map(all.map((c, i) => [c.t, i]));
  // Extreme-level pressure: who took control AT the swing. Blends three signals
  // into a buyer share (0-1): wick rejection on the swing candle, volume-weighted
  // order flow of the reaction candles, and displacement away from the level in ATR.
  const atrAt = (end: number) => {
    const first = Math.max(1, end - 13);
    let sum = 0;
    let count = 0;
    for (let k = first; k <= end; k++) {
      const c = all[k], p = all[k - 1];
      sum += Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c));
      count += 1;
    }
    return count > 0 ? sum / count : 0;
  };
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const legFor = (t: number, kind: "high" | "low") => {
    const i = idxOf.get(t);
    if (i == null) return;
    const piv = all[i];
    const range = piv.h - piv.l;
    if (!(range > 0)) return;
    const high = kind === "high";
    // Anchor volatility to information available around this swing. Using the
    // newest chart ATR made old percentages drift whenever current volatility
    // changed, even though their ten-candle confirmation window was unchanged.
    const localAtr = atrAt(i);
    // 1) Rejection: wick at the extreme + where the swing candle closed.
    const wick = high ? piv.h - Math.max(piv.o, piv.c) : Math.min(piv.o, piv.c) - piv.l;
    const closeLoc = (piv.c - piv.l) / range;
    const rejectSide = clamp01(0.6 * (wick / range) + 0.4 * (high ? 1 - closeLoc : closeLoc));
    const rejection = high ? 1 - rejectSide : rejectSide;
    // 2) Reaction flow: volume-weighted close location + body direction.
    const end = Math.min(all.length - 1, i + FRACTAL_RADIUS);
    const volumeSample = all.slice(Math.max(0, i - 20), i + 1);
    const avgV = volumeSample.reduce((s, c) => s + (c.v ?? 0), 0) / Math.max(1, volumeSample.length) || 1;
    let fb = 0, fw = 0, farClose = high ? Infinity : -Infinity;
    let streak = 0; // current consecutive candles closing in the reversal direction
    let maxStreak = 0;
    let delta = 0; // cumulative body, signed + = buyers
    let climaxVol = 0; // biggest volume spike in the reaction
    let directionalVolume = 0;
    let totalVolume = 0;
    let path = 0;
    let priorClose = piv.c;
    let closesAway = 0;
    for (let k = i + 1; k <= end; k++) {
      const c = all[k];
      const r = c.h - c.l;
      if (!(r > 0)) continue;
      const volW = c.v && c.v > 0 ? c.v / avgV : 1;
      const w = volW * r;
      const loc = (c.c - c.l) / r;
      const body = (c.c - c.o) / r; // -1..1
      fb += w * clamp01(0.6 * loc + 0.4 * (0.5 + body / 2));
      fw += w;
      delta += body * volW;
      directionalVolume += body * (c.v && c.v > 0 ? c.v : avgV);
      totalVolume += c.v && c.v > 0 ? c.v : avgV;
      path += Math.abs(c.c - priorClose);
      priorClose = c.c;
      if (volW > climaxVol) climaxVol = volW;
      // Momentum streak: does the reaction keep printing same-direction candles?
      const dir = c.c > c.o ? 1 : c.c < c.o ? -1 : 0;
      if (dir !== 0) {
        const revDir = high ? -1 : 1; // after a high, sellers = bearish candles
        streak = dir === revDir ? streak + 1 : 0;
        maxStreak = Math.max(maxStreak, streak);
      }
      const pivotMid = (piv.h + piv.l) / 2;
      if (high ? c.c < pivotMid : c.c > pivotMid) closesAway += 1;
      // Displacement is body-close based. A later wick alone must not inflate
      // reversal pressure or make a weak reaction look confirmed.
      farClose = high ? Math.min(farClose, c.c) : Math.max(farClose, c.c);
    }
    const bars = end - i;
    const evidence = Math.min(1, bars / FRACTAL_RADIUS);
    const flow = fw > 0 ? fb / fw : 0.5;
    // 3) Displacement: distance price travelled away from the level (2 ATR = full).
    const move = bars > 0 && localAtr > 0
      ? clamp01((high ? piv.h - farClose : farClose - piv.l) / (2 * localAtr))
      : 0;
    const disp = high ? 0.5 - move / 2 : 0.5 + move / 2;
    // 4) Momentum burst: signed cumulative delta normalised by bars, plus the
    //    longest same-direction streak. Strong one-sided reactions = strong side.
    const deltaNorm = bars > 0 ? clamp01(0.5 + delta / (bars * 2)) : 0.5;
    const streakNorm = clamp01(maxStreak / 3); // 3+ consecutive candles = full
    const momentum = 0.6 * deltaNorm + 0.4 * streakNorm;
    // 5) Exhaustion climax: a volume spike >= 1.5x average at the extreme marks
    //    capitulation; blend it toward the side that won the rejection.
    const climax = clamp01((climaxVol - 1) / 1.5); // 0 until 1.5x, 1 at 2.5x+
    // Fresh swings lean on rejection until reaction candles print.
    const wRej = 0.3 + 0.3 * (1 - evidence);
    const wFlow = 0.3 * evidence;
    const wDisp = 0.2 * evidence;
    const wMom = 0.2 * evidence;
    let buy =
      (rejection * wRej + flow * wFlow + disp * wDisp + momentum * wMom) /
      (wRej + wFlow + wDisp + wMom);
    // Climax volume amplifies whichever side the rejection already favours.
    buy = buy + (buy - 0.5) * 0.4 * climax;
    // Conviction sharpening: the more closed-candle evidence we have, the more
    // the score is pushed away from 50/50 toward the winning side.
    const sharpen = 1 + 0.5 * evidence;
    buy = 0.5 + (buy - 0.5) * sharpen;
    // Direction lock: a swing low is where buyers won (market went up), a swing
    // high is where sellers won (market went down). The signals only decide HOW
    // strong the winning side is, never flip it to the losing side.
    // Only evidence that agrees with the reversal adds strength; opposing
    // signals no longer inflate the winning side's percentage.
    const agree = high ? 0.5 - buy : buy - 0.5;
    // 6) Liquidity sweep: swing candle ran past the prior 20-bar extreme and
    //    closed back inside — stop hunt, strongest reversal footprint.
    const look = all.slice(Math.max(0, i - 20), i);
    let sweep = 0;
    if (look.length >= 5) {
      const prior = high ? Math.max(...look.map((c) => c.h)) : Math.min(...look.map((c) => c.l));
      const took = high ? piv.h > prior : piv.l < prior;
      const closedBack = high ? piv.c < prior : piv.c > prior;
      if (took && closedBack) sweep = 1;
      else if (took) sweep = 0.4;
    }
    // 7) Approach exhaustion: bodies shrinking into the extreme (last 3 vs
    //    previous 3 candles) = the pushing side is running out of fuel.
    const bodyOf = (c: Candle) => Math.abs(c.c - c.o);
    const a = all.slice(Math.max(0, i - 3), i), b0 = all.slice(Math.max(0, i - 6), Math.max(0, i - 3));
    const avgA = a.length ? a.reduce((s, c) => s + bodyOf(c), 0) / a.length : 0;
    const avgB = b0.length ? b0.reduce((s, c) => s + bodyOf(c), 0) / b0.length : 0;
    const exhaustion = avgB > 0 ? clamp01(1 - avgA / avgB) : 0;
    // 8) Swing-candle volume vs average: absorption at the level.
    const absorb = piv.v && piv.v > 0 ? clamp01((piv.v / avgV - 1) / 1.5) : 0;
    // 9) Engulfing confirmation: first reaction candle engulfs the swing body
    //    in the reversal direction.
    let engulf = 0;
    const nx = all[i + 1];
    if (nx) {
      const lo = Math.min(piv.o, piv.c), hi = Math.max(piv.o, piv.c);
      const revBody = high ? nx.c < nx.o : nx.c > nx.o;
      if (revBody && Math.min(nx.o, nx.c) <= lo && Math.max(nx.o, nx.c) >= hi) engulf = 1;
    }
    // 10) Structure break: reaction closed beyond the opposite end of the
    //     leg into the swing (mini BOS/CHoCH).
    let bos = 0;
    if (a.length) {
      const legEnd = high ? Math.min(...a.map((c) => c.l)) : Math.max(...a.map((c) => c.h));
      for (let k = i + 1; k <= end; k++) {
        if (high ? all[k].c < legEnd : all[k].c > legEnd) { bos = 1; break; }
      }
    }
    // 11) Failed retest: price came back near the extreme (within 0.3 ATR)
    //     but could not close beyond it — level defended twice.
    let defended = 0;
    if (localAtr > 0) {
      for (let k = i + 2; k <= end; k++) {
        const c = all[k];
        const near = high ? Math.abs(piv.h - c.h) <= 0.3 * localAtr : Math.abs(c.l - piv.l) <= 0.3 * localAtr;
        const held = high ? c.c < piv.h : c.c > piv.l;
        if (near && held) { defended = 1; break; }
      }
    }
    // 12) Strict two-candle reversal confirmation. Candle 1 must BODY-close
    // through the swing body's opposite edge; candle 2 must retest that edge,
    // hold beyond it and close in the reversal direction. A wick never counts.
    const trigger = high ? Math.min(piv.o, piv.c) : Math.max(piv.o, piv.c);
    let twoCandleConfirmation = 0;
    for (let k = i + 1; k < end; k++) {
      const first = all[k];
      const second = all[k + 1];
      const bodyBreak = high ? first.c < trigger : first.c > trigger;
      if (!bodyBreak) continue;
      const tolerance = Math.max(localAtr * 0.2, piv.c * 0.00002);
      const retested = high ? second.h >= trigger - tolerance : second.l <= trigger + tolerance;
      const held = high ? second.c < trigger : second.c > trigger;
      const directionalClose = high ? second.c < second.o : second.c > second.o;
      if (retested && held && directionalClose) {
        twoCandleConfirmation = 1;
        break;
      }
    }
    // 13) Reaction quality. A real reversal should move efficiently away from
    //     the wick, keep closes beyond the pivot midpoint and carry directional
    //     volume. Choppy reactions therefore cannot earn an inflated score.
    const netMove = bars > 0 ? Math.abs(all[end].c - piv.c) : 0;
    const efficiency = path > 0 ? clamp01(netMove / path) : 0;
    const persistence = bars > 0 ? clamp01(closesAway / bars) : 0;
    const volumeBias = totalVolume > 0 ? clamp01(0.5 + directionalVolume / (2 * totalVolume)) : 0.5;
    const directionalBias = high ? 1 - volumeBias : volumeBias;

    // Require independent evidence families to agree. Bonuses only become
    // strong when price action, structure and participation confirm together.
    const footprint = Math.max(sweep, absorb, exhaustion);
    // A lone engulfing candle, BOS or defended wick can support the score but
    // cannot equal a completed break-and-retest sequence.
    const confirmation = Math.max(0.55 * engulf, 0.7 * bos, 0.6 * defended, twoCandleConfirmation);
    const followThrough = 0.4 * efficiency + 0.35 * persistence + 0.25 * directionalBias;
    // 14) Range location: highs in premium, lows in discount of last 50 bars.
    const rng = all.slice(Math.max(0, i - 50), i + 1);
    const rHi = Math.max(...rng.map((c) => c.h));
    const rLo = Math.min(...rng.map((c) => c.l));
    const pos = rHi > rLo ? ((high ? piv.h : piv.l) - rLo) / (rHi - rLo) : 0.5;
    const context = rng.length >= 20 ? clamp01(high ? pos : 1 - pos) : undefined;
    // 15) Invalidation during the same fixed confirmation window. Scanning all
    // future history would repaint an old signal with information unavailable
    // when its ten-candle reading became final.
    let invalidated = false;
    for (let k = i + 1; k <= Math.min(end, fractalBars.length - 1); k++) {
      if (high ? all[k].c > piv.h : all[k].c < piv.l) { invalidated = true; break; }
    }
    const strength = reversalPressureStrength({
      directionalAgreement: agree,
      displacement: move,
      footprint,
      confirmation,
      followThrough,
      streak: streakNorm,
      evidence,
      directionalBias,
      efficiency,
      persistence,
      context,
      invalidated,
    });
    buy = high ? 0.5 - strength : 0.5 + strength;
    // Failed reversal: if closed candles in the window moved AGAINST the swing
    // (market kept rising after a high / kept falling after a low) the
    // opposite side is in control. Show that side instead of a misleading
    // reversal-side majority. Capped at 70% so it never reaches the 72% gate.
    const closedEnd = Math.min(end, fractalBars.length - 1);
    const netSigned = closedEnd > i ? all[closedEnd].c - piv.c : 0;
    const againstMove = high ? netSigned : -netSigned;
    if (invalidated || (againstMove > 0 && agree <= 0)) {
      const againstAtr = localAtr > 0 ? clamp01(againstMove / (2 * localAtr)) : 0;
      const counter = Math.min(0.2, 0.04 + 0.14 * againstAtr + (invalidated ? 0.04 : 0));
      buy = high ? 0.5 + counter : 0.5 - counter;
    }
    pressure[t] = Math.round(clamp01(buy) * 100);
  };
  for (const p of pivotsLabelled) legFor(p.t, p.kind);
  for (const p of livePivots) legFor(p.t, p.kind);
  const targetBuySide = fractal.pivots
    .filter((p) => p.kind === "high")
    .map((p) => p.price)
    .sort((a, b) => a - b);
  const targetSellSide = fractal.pivots
    .filter((p) => p.kind === "low")
    .map((p) => p.price)
    .sort((a, b) => b - a);
  const latestAtr = atrAt(all.length - 1);
  const reversal = computeReversalSignal(fractalBars, forming ? toCandle(forming) : null, [
    ...pivotsLabelled,
    ...livePivots,
  ], pressure, latestAtr, targetBuySide, targetSellSide);
  // Zones on every swing label, built from server-fed CLOSED candles only
  // (live swings included) so every browser/account sees identical zones;
  // per-browser live ticks on the forming candle never create or move a zone.
  const confirmedKeys = new Set(fractal.pivots.map((p) => `${p.kind}:${p.t}`));
  const closedIdx = new Map(fractalBars.map((b, k) => [b.t, k] as const));
  const liveZonePivots = computeLivePivots(fractalBars, null, fractal.pivots)
    .filter((p) => !confirmedKeys.has(`${p.kind}:${p.t}`))
    .map((p) => ({ index: closedIdx.get(p.t) ?? -1, t: p.t, price: p.price, kind: p.kind, label: p.label, live: !p.confirmedByOpposite }))
    .filter((p) => p.index >= 0);
  const zonePivots = [...fractal.pivots, ...liveZonePivots];
  const sdZones = computeFreshZones(fractalBars, zonePivots, undefined, undefined, false);
  const sdHistoryZones: SdZone[] = [];
  const sdStrategyZones = computeFreshZones(fractalBars, zonePivots, undefined, undefined, true, sdHistoryZones, 10);
  const liquidityMap = computeLiquidityMap(fractalBars, forming ? toCandle(forming) : null, fractal.pivots);
  // Wider pool: the chart keeps the newest 2 that survive overlap removal.
  const freshFvgs = computeFreshFvgs(fractalBars, 8);
  return {
    freshFvgs,
    reversal,
    pressure,
    sdZones,
    sdStrategyZones,
    sdHistoryZones,
    liquidityMap,
    pivots: pivotsLabelled,
    livePivots,
    breaks: breaks.slice(-8),
    fvgs: selectedPois.fvgs,
    orderBlocks: selectedPois.orderBlocks,
    buySide,
    sellSide,
    trend: fractal.trend,
    windowStart: fractalBars[0].t,
  };
}

export type SmcProjector = {
  x: (tSeconds: number) => number | null;
  y: (p: number) => number | null;
  width: number;
  height: number;
};

export function structureBadgeTop(wickY: number, isHigh: boolean, chartHeight: number): number {
  const badgeHeight = 18;
  const gap = 4;
  const wanted = isHigh ? wickY - badgeHeight - gap : wickY + gap;
  return Math.max(2, Math.min(Math.max(2, chartHeight - badgeHeight - 2), wanted));
}

export function breakLabelBaseline(lineY: number, bullish: boolean, chartHeight: number): number {
  const wanted = bullish ? lineY - 7 : lineY + 17;
  return Math.max(15, Math.min(Math.max(15, chartHeight - 3), wanted));
}

export function renderSmcOverlay(
  ctx: CanvasRenderingContext2D,
  smc: SmcOverlay,
  toggles: SmcToggles,
  pr: SmcProjector,
  showPressure = true,
) {
  ctx.save();
  ctx.font = "600 13px 'JetBrains Mono', ui-monospace, monospace";
  const dottedLine = (tMs: number, price: number, color: string) => {
    const x0 = pr.x(tMs / 1000);
    const y = pr.y(price);
    if (x0 == null || y == null) return;
    const x = Math.max(0, x0);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(pr.width, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const orderBlock = (ob: OrderBlockZone) => {
    const x0 = pr.x(ob.t / 1000);
    const topY = pr.y(ob.top);
    const bottomY = pr.y(ob.bottom);
    if (x0 == null || topY == null || bottomY == null) return;

    const supply = ob.type === "SUPPLY";
    const x = Math.max(0, x0);
    const width = Math.max(1, pr.width - x);
    const y = Math.min(topY, bottomY);
    const height = Math.max(2, Math.abs(bottomY - topY));
    const edge = supply ? "rgb(239,68,68)" : "rgb(16,185,129)";
    const fill = supply ? "rgba(239,68,68,0.11)" : "rgba(16,185,129,0.11)";
    const label = supply ? "SUPPLY ZONE" : "DEMAND ZONE";

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(pr.width, y);
    ctx.moveTo(x, y + height);
    ctx.lineTo(pr.width, y + height);
    ctx.stroke();

    const textWidth = ctx.measureText(label).width;
    const labelX = Math.min(pr.width - textWidth - 12, Math.max(x + 8, x + width / 2 - textWidth / 2));
    const labelY = y + height / 2;
    ctx.fillStyle = plate(ctx, 0.92);
    ctx.beginPath();
    ctx.roundRect?.(labelX - 6, labelY - 11, textWidth + 12, 22, 4);
    if (!ctx.roundRect) ctx.rect(labelX - 6, labelY - 11, textWidth + 12, 22);
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY + 1);
    ctx.textBaseline = "alphabetic";
  };

  const fairValueGap = (gap: FairValueGap) => {
    const x0 = pr.x(gap.t / 1000);
    const topY = pr.y(gap.top);
    const bottomY = pr.y(gap.bottom);
    if (x0 == null || topY == null || bottomY == null) return;

    const x = Math.max(0, x0);
    const width = Math.max(1, pr.width - x);
    const y = Math.min(topY, bottomY);
    const height = Math.max(2, Math.abs(bottomY - topY));
    const bullish = gap.type === "BULLISH_FVG";
    const edge = bullish ? "rgb(34,197,94)" : "rgb(242,54,69)";
    const fill = bullish ? "rgba(34,197,94,0.1)" : "rgba(242,54,69,0.1)";
    const label = bullish ? "BULLISH FVG" : "BEARISH FVG";

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(pr.width, y);
    ctx.moveTo(x, y + height);
    ctx.lineTo(pr.width, y + height);
    ctx.stroke();

    const textWidth = ctx.measureText(label).width;
    const labelX = Math.min(pr.width - textWidth - 12, Math.max(x + 8, x + width / 2 - textWidth / 2));
    const labelY = y + height / 2;
    ctx.fillStyle = plate(ctx, 0.92);
    ctx.beginPath();
    ctx.roundRect?.(labelX - 6, labelY - 11, textWidth + 12, 22, 4);
    if (!ctx.roundRect) ctx.rect(labelX - 6, labelY - 11, textWidth + 12, 22);
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY + 1);
    ctx.textBaseline = "alphabetic";
  };

  const sdLabelRects: Array<{ x0: number; x1: number; y: number }> = [];
  // Same visual language as order blocks / FVGs: soft fill, solid edges to
  // the right, centred white label with coloured text.
  const sdZone = (z: SdZone, withPlan = false) => {
    const x0 = pr.x(z.t / 1000);
    const topY = pr.y(z.top);
    const bottomY = pr.y(z.bottom);
    if (x0 == null || topY == null || bottomY == null) return;
    if (x0 > pr.width) return;
    const supply = z.type === "SUPPLY";
    const x = Math.max(0, x0);
    const width = Math.max(1, pr.width - x);
    const y = Math.min(topY, bottomY);
    const height = Math.max(2, Math.abs(bottomY - topY));
    const edge = supply ? "rgb(239,68,68)" : "rgb(16,185,129)";
    const fill = supply
      ? `rgba(239,68,68,${z.fresh ? 0.11 : 0.07})`
      : `rgba(16,185,129,${z.fresh ? 0.11 : 0.07})`;
    // Simple zone label only — grade/strength stay internal (they gate the plan).
    const label = supply ? "SUPPLY ZONE" : "DEMAND ZONE";

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.25;
    if (z.live) ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(pr.width, y);
    ctx.moveTo(x, y + height);
    ctx.lineTo(pr.width, y + height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "600 13px 'JetBrains Mono', ui-monospace, monospace";
    const textWidth = ctx.measureText(label).width;
    // Zones with plan tags on the right edge keep their label clear of them.
    const planReserve = withPlan ? 150 : 0;
    let labelX = Math.min(pr.width - textWidth - 12 - planReserve, Math.max(x + 8, x + width / 2 - textWidth / 2));
    if (withPlan && labelX < x + 8) labelX = Math.max(8, x - textWidth - 14);
    // Keep zone labels from stacking on each other when zones sit close on screen.
    const collides = (cy: number) =>
      sdLabelRects.some((r) => Math.abs(r.y - cy) < 24 && labelX < r.x1 && labelX + textWidth > r.x0);
    const candidates = [y + height / 2, y - 13, y + height + 13, y - 37, y + height + 37];
    const labelY = candidates.find((cy) => !collides(cy)) ?? candidates[0];
    sdLabelRects.push({ x0: labelX - 6, x1: labelX + textWidth + 6, y: labelY });
    ctx.fillStyle = plate(ctx, 0.92);
    ctx.beginPath();
    ctx.roundRect?.(labelX - 6, labelY - 11, textWidth + 12, 22, 4);
    if (!ctx.roundRect) ctx.rect(labelX - 6, labelY - 11, textWidth + 12, 22);
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY + 1);
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  };

  // Fresh FVG: same look as supply/demand zones (soft fill, solid edges,
  // centred white label). Tested gaps get a lighter fill and dashed edges.
  const freshFvg = (f: FreshFvg) => {
    const x0 = pr.x(f.t / 1000);
    const topY = pr.y(f.top);
    const bottomY = pr.y(f.bottom);
    if (x0 == null || topY == null || bottomY == null) return;
    if (x0 > pr.width) return;
    const bullish = f.type === "BULLISH";
    const x = Math.max(0, x0);
    const width = Math.max(1, pr.width - x);
    const y = Math.min(topY, bottomY);
    const height = Math.max(2, Math.abs(bottomY - topY));
    const edge = bullish ? "rgb(34,197,94)" : "rgb(242,54,69)";
    const fill = bullish
      ? `rgba(34,197,94,${f.fresh ? 0.12 : 0.07})`
      : `rgba(242,54,69,${f.fresh ? 0.12 : 0.07})`;
    const label = bullish ? "BULLISH FVG" : "BEARISH FVG";
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.25;
    if (!f.fresh) ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(pr.width, y);
    ctx.moveTo(x, y + height);
    ctx.lineTo(pr.width, y + height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
    const textWidth = ctx.measureText(label).width;
    const labelX = Math.min(pr.width - textWidth - 12, Math.max(x + 8, x + width / 2 - textWidth / 2));
    const collides = (cy: number) =>
      sdLabelRects.some((r) => Math.abs(r.y - cy) < 22 && labelX < r.x1 && labelX + textWidth > r.x0);
    const candidates = [y + height / 2, y - 12, y + height + 12, y - 34, y + height + 34];
    const labelY = candidates.find((cy) => !collides(cy)) ?? candidates[0];
    sdLabelRects.push({ x0: labelX - 6, x1: labelX + textWidth + 6, y: labelY });
    ctx.fillStyle = plate(ctx, 0.92);
    ctx.beginPath();
    ctx.roundRect?.(labelX - 6, labelY - 10, textWidth + 12, 20, 4);
    if (!ctx.roundRect) ctx.rect(labelX - 6, labelY - 10, textWidth + 12, 20);
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY + 1);
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  };

  // Previous zone + its FVG: faded, dashed box ending where the zone died.
  const previousZone = (z: SdZone) => {
    const x0 = pr.x(z.t / 1000);
    if (x0 == null || x0 > pr.width) return;
    const x1raw = z.endT != null ? pr.x(z.endT / 1000) : pr.width;
    const x1 = Math.min(pr.width, x1raw ?? pr.width);
    if (x1 < 0) return;
    const xa = Math.max(0, x0);
    const box = (top: number, bottom: number, color: string, label: string, fromX: number) => {
      const topY = pr.y(top);
      const bottomY = pr.y(bottom);
      if (topY == null || bottomY == null) return;
      const y = Math.min(topY, bottomY);
      const h = Math.max(2, Math.abs(bottomY - topY));
      const w = Math.max(6, x1 - fromX);
      ctx.fillStyle = `rgba(${color},0.06)`;
      ctx.fillRect(fromX, y, w, h);
      ctx.strokeStyle = `rgba(${color},0.55)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(fromX, y, w, h);
      ctx.setLineDash([]);
      ctx.font = "600 10px 'JetBrains Mono', ui-monospace, monospace";
      const tw = ctx.measureText(label).width;
      if (w < tw + 8) return;
      ctx.fillStyle = `rgba(${color},0.85)`;
      ctx.textBaseline = "middle";
      ctx.fillText(label, fromX + 4, y + h / 2);
      ctx.textBaseline = "alphabetic";
    };
    const supply = z.type === "SUPPLY";
    ctx.save();
    box(z.top, z.bottom, supply ? "239,68,68" : "16,185,129", supply ? "PREV SUPPLY" : "PREV DEMAND", xa);
    if (z.fvg) {
      const fx = pr.x(z.fvg.t / 1000);
      if (fx != null && fx < x1) {
        box(z.fvg.top, z.fvg.bottom, z.fvg.type === "BULLISH" ? "34,197,94" : "242,54,69", "PREV FVG", Math.max(0, fx));
      }
    }
    ctx.restore();
  };

  // Entry / SL / TP1 / TP2 lines for a fresh zone's limit-order plan.
  const sdPlan = (z: SdZone) => {
    const plan = z.plan;
    if (!plan) return;
    const x0 = pr.x(z.t / 1000);
    if (x0 == null || x0 > pr.width) return;
    const x = Math.max(0, x0);
    const rows: Array<[string, number, string]> = [
      [`${plan.side} ENTRY`, plan.entry, "#FD5510"],
      ["SL", plan.sl, "rgb(239,68,68)"],
      ["TP1", plan.tp1, "rgb(16,185,129)"],
      ["TP2", plan.tp2, "rgb(5,150,105)"],
    ];
    ctx.save();
    ctx.font = "700 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.lineWidth = 1.25;
    for (const [name, price, color] of rows) {
      const y = pr.y(price);
      if (y == null) continue;
      ctx.strokeStyle = color;
      ctx.setLineDash(name === "SL" || name.endsWith("ENTRY") ? [] : [4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(pr.width, y);
      ctx.stroke();
      const text = `${name} ${price.toFixed(2)}`;
      const tw = ctx.measureText(text).width;
      const lx = pr.width - tw - 14;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect?.(lx - 5, y - 9, tw + 10, 18, 3);
      if (!ctx.roundRect) ctx.rect(lx - 5, y - 9, tw + 10, 18);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(text, lx, y + 1);
      ctx.textBaseline = "alphabetic";
    }
    ctx.setLineDash([]);
    ctx.restore();
  };

  // Newest wins across zones and FVGs. Always resolve with BOTH lists so a
  // hidden FVG still removes the zone it printed on top of — otherwise
  // browsers with different switch settings showed different zones. The
  // switches only control what gets drawn.
  // Strategy ON: every new HH/HL/LH/LL is checked for a fresh zone that a
  // same-direction displacement FVG confirmed; only the latest 1 shows, with
  // its FVG. Strategy OFF: classic view, 1 zone + 1 standalone FVG.
  const strategy = toggles.sdZones && toggles.sdStrategy !== false;
  // Only things that are actually drawn may suppress each other: strategy
  // mode never draws standalone FVGs (zones already passed the opposing-FVG
  // check), and timeframes without zones must not let hidden zones remove FVGs.
  const visible = strategy
    ? resolveZoneOverlaps(smc.sdStrategyZones ?? [], [], FVG_MAX_TOTAL, SD_VISIBLE_ZONES)
    : resolveZoneOverlaps(toggles.sdZones ? smc.sdZones ?? [] : [], smc.freshFvgs ?? [], FVG_MAX_TOTAL, 1);
  if (toggles.sdHistory) {
    // Previous zones sit underneath the live ones, faded and boxed between the
    // swing candle and the candle where each zone ended.
    for (const z of smc.sdHistoryZones ?? []) previousZone(z);
  }
  if (toggles.sdZones) {
    const zones = visible.sdZones;
    // Strategy zones always draw with their own FVG (one indicator), even
    // when the standalone Fresh FVG switch is off.
    if (strategy) {
      for (const z of zones) if (z.fvg) freshFvg(z.fvg);
    }
    const planned = toggles.sdPlan === false ? undefined : [...zones].reverse().find((z) => z.plan);
    for (const z of zones) sdZone(z, z === planned);
    if (planned) sdPlan(planned);
  }
  if (toggles.freshFvg && !strategy) {
    for (const f of visible.fvgs) freshFvg(f);
  }
  if (toggles.orderBlocks) {
    for (const ob of smc.orderBlocks) orderBlock(ob);
  }
  if (toggles.liquidity) {
    ctx.setLineDash([6, 4]);
    // BSL sits just above (label above), SSL just below (label below) so they
    // never overlap supply/demand zone edges or their labels.
    const liq = (price: number, label: string, color: string, above: boolean) => {
      const rawY = pr.y(price);
      if (rawY == null) return;
      const y = above ? rawY - 5 : rawY + 5;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(pr.width * 0.55, y);
      ctx.lineTo(pr.width, y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(`${label} ${price.toFixed(2)}`, pr.width * 0.55 + 4, above ? y - 5 : y + 15);
    };
    // The sweep indicator already draws every pool — never draw them twice.
    if (!toggles.sweeps) {
      smc.buySide.slice(0, 1).forEach((p) => liq(p, "BSL", "#089981", true));
      smc.sellSide.slice(0, 1).forEach((p) => liq(p, "SSL", "#f23645", false));
    }
    ctx.setLineDash([]);
  }
  if (toggles.sweeps && smc.liquidityMap) renderLiquidityMap(ctx, smc.liquidityMap, pr);
  if (toggles.breaks) {
    for (const b of smc.breaks) {
      const x0 = pr.x(b.fromT / 1000);
      const x1 = pr.x(b.t / 1000);
      const y = pr.y(b.level);
      if (x0 == null || x1 == null || y == null) continue;
       if (x1 < 0 || x0 > pr.width) continue;
       const lineStart = Math.max(0, x0);
       const lineEnd = Math.min(pr.width, x1);
       if (lineEnd - lineStart < 24) continue;
      const color = b.dir === "bullish" ? "#089981" : "#f23645";
      ctx.strokeStyle = color;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
       ctx.moveTo(lineStart, y);
       ctx.lineTo(lineEnd, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      const label = b.type === "CHOCH" ? "CHoCH" : b.type;
      const w = ctx.measureText(label).width;
       // Anchor to the real break segment (not the visible clip) so it never slides.
       const labelX = (x0 + x1) / 2 - w / 2;
       ctx.fillText(label, labelX, b.dir === "bullish" ? y - 7 : y + 16);
    }
  }
  const pressureBadge = (t: number, xx: number, yy: number, up: boolean) => {
    if (!showPressure) return;
    const buy = smc.pressure?.[t];
    if (buy == null) return;
    const sell = 100 - buy;
    const bw = 92;
    const bh = 22;
    const bx = xx - bw / 2;
    const by = up ? yy - bh - 4 : yy + 20 + 4;
    ctx.save();
    ctx.fillStyle = plate(ctx, 0.96);
    ctx.strokeStyle = isDarkCanvas(ctx) ? "#3a3a3a" : "#d6dae3";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect?.(bx, by, bw, bh, 5);
    if (!ctx.roundRect) ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();
    const barY = by + bh - 5;
    ctx.fillStyle = "#089981";
    ctx.fillRect(bx + 4, barY, ((bw - 8) * buy) / 100, 3);
    ctx.fillStyle = "#f23645";
    ctx.fillRect(bx + 4 + ((bw - 8) * buy) / 100, barY, ((bw - 8) * sell) / 100, 3);
    ctx.font = "700 12px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = "#089981";
    ctx.fillText(`B${buy}%`, bx + 5, by + 13);
    ctx.fillStyle = "#f23645";
    const st = `S${sell}%`;
    ctx.fillText(st, bx + bw - 5 - ctx.measureText(st).width, by + 13);
    ctx.restore();
  };
  if (toggles.structure) {
    for (const p of smc.pivots) {
      const x = pr.x(p.t / 1000);
      const y = pr.y(p.price);
      if (x == null || y == null) continue;
       if (x < 0 || x > pr.width) continue;
      const up = p.kind === "high";
      const color = p.label === "HH" || p.label === "HL" ? "#089981" : "#f23645";
      const w = ctx.measureText(p.label).width + 14;
       // Fixed to the pivot candle wick — no edge clamping, so it never drifts.
       const yy = up ? y - 24 : y + 5;
       const xx = x;
      ctx.fillStyle = color;
      ctx.beginPath();
       ctx.roundRect?.(xx - w / 2, yy, w, 18, 4);
       if (!ctx.roundRect) ctx.rect(xx - w / 2, yy, w, 18);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
       ctx.fillText(p.label, xx - w / 2 + 7, yy + 13.5);
      pressureBadge(p.t, xx, yy, up);
    }
    // Live (unconfirmed) swings: outlined dashed badge that follows the forming candle.
    for (const p of smc.livePivots ?? []) {
      const x = pr.x(p.t / 1000);
      const y = pr.y(p.price);
      if (x == null || y == null) continue;
       if (x < 0 || x > pr.width) continue;
      const up = p.kind === "high";
      const color = p.label === "HH" || p.label === "HL" || p.label === "L" ? "#089981" : "#f23645";
      const text = p.label;
      const w = ctx.measureText(text).width + 14;
       // Fixed to the pivot candle wick — no edge clamping, so it never drifts.
       const yy = up ? y - 24 : y + 5;
       const xx = x;
      if (p.confirmedByOpposite) {
        // Solid badge, same as a confirmed pivot — no countdown.
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect?.(xx - w / 2, yy, w, 18, 4);
        if (!ctx.roundRect) ctx.rect(xx - w / 2, yy, w, 18);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, xx - w / 2 + 7, yy + 13.5);
        pressureBadge(p.t, xx, yy, up);
        continue;
      }
      // Early "High"/"Low" marker on the running swing (no countdown box).
      if (!SHOW_PROVISIONAL_PIVOTS) {
        // New swing shown immediately with its real label (HH/HL/LH/LL)
        // plus fresh buyer/seller pressure as soon as the high/low forms.
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect?.(xx - w / 2, yy, w, 18, 4);
        if (!ctx.roundRect) ctx.rect(xx - w / 2, yy, w, 18);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, xx - w / 2 + 7, yy + 13.5);
        pressureBadge(p.t, xx, yy, up);
        continue;
      }
      ctx.fillStyle = plate(ctx, 0.92);
      ctx.beginPath();
       ctx.roundRect?.(xx - w / 2, yy, w, 18, 4);
       if (!ctx.roundRect) ctx.rect(xx - w / 2, yy, w, 18);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
       ctx.fillText(text, xx - w / 2 + 7, yy + 13.5);
      pressureBadge(p.t, xx, yy, up);
      // Confirmation tracker: candles left + invalidation level.
      const left = p.confirmIn ?? 0;
      const done = FRACTAL_RADIUS - left;
      const tw = 190;
      const th = 52;
      const tx = xx - tw / 2;
      const ty = up ? yy - 22 - 4 - th - 4 : yy + 20 + 4 + 22 + 4;
      ctx.save();
      ctx.fillStyle = plate(ctx, 0.97);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.roundRect?.(tx, ty, tw, th, 5);
      if (!ctx.roundRect) ctx.rect(tx, ty, tw, th);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "700 11px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillStyle = color;
      const head = left === 0 ? `${p.label} confirming…` : `${p.label} confirm in ${left} candle${left === 1 ? "" : "s"}`;
      ctx.fillText(head, tx + 6, ty + 12);
      ctx.font = "600 10px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillStyle = "#475569";
      ctx.fillText(`${up ? "Cancel above" : "Cancel below"} ${p.price.toFixed(2)}`, tx + 6, ty + 23);
      if (p.earlyLevel != null)
        ctx.fillText(`Early: close ${up ? "below" : "above"} ${p.earlyLevel.toFixed(2)}`, tx + 6, ty + 34);
      const eta = p.confirmAt ? new Date(p.confirmAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
      ctx.fillStyle = color;
      ctx.fillText(`Hold ${p.confirmChance ?? 0}% · ETA ${eta}`, tx + 6, ty + 45);
      const segW = (tw - 12) / FRACTAL_RADIUS;
      for (let s = 0; s < FRACTAL_RADIUS; s++) {
        ctx.fillStyle = s < done ? color : "#e2e8f0";
        ctx.fillRect(tx + 6 + s * segW, ty + th - 4, segW - 1.5, 2);
      }
      ctx.restore();
    }
  }
  // Pressure no longer draws any Entry/SL/TP lines (user request); trade
  // plans come only from the Zone + FVG strategy.
  ctx.restore();
}

/** Liquidity sweep indicator: resting pools (next sweep targets) + sweeps. */
function renderLiquidityMap(ctx: CanvasRenderingContext2D, map: LiquidityMap, pr: SmcProjector) {
  // Only a small cross on the candle that grabbed liquidity — no lines or labels.
  ctx.save();
  ctx.lineWidth = 2;
  for (const s of map.sweeps.filter((x) => x.strength >= LIQ_MIN_DRAWN_SWEEP).slice(-4)) {
    const x = pr.x(s.t / 1000);
    const yx = pr.y(s.extreme);
    if (x == null || yx == null || x < 0 || x > pr.width) continue;
    // SSL sweep: cross under the low wick. BSL sweep: cross just beyond the high wick.
    const y = s.side === "SSL" ? yx + 12 : yx - 12;
    const r = 4;
    ctx.strokeStyle = s.side === "BSL" ? "#f23645" : "#089981";
    ctx.beginPath();
    ctx.moveTo(x - r, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.moveTo(x + r, y - r);
    ctx.lineTo(x - r, y + r);
    ctx.stroke();
  }
  ctx.restore();
}
