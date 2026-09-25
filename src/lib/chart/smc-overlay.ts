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
 *  - confirmed: a later CLOSED candle closes beyond the swing candle's body on the reversal side
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
  const range = piv.h - piv.l || 1e-9;
  const wick = high ? piv.h - Math.max(piv.o, piv.c) : Math.min(piv.o, piv.c) - piv.l;
  const prior = swings.filter((s) => s.kind === last.kind && s.t < last.t).sort((a, b) => b.t - a.t)[0];
  const swept = !!prior && (high ? last.price > prior.price : last.price < prior.price);
  const buyPct = pressure[last.t] ?? 50;
  const winPct = high ? 100 - buyPct : buyPct;
  let score = 35 + (winPct - 50) * 0.6 + Math.min(20, (wick / range) * 30) + (swept ? 12 : 0);
  const buffer = Math.max(atr * 0.1, last.price * 0.00003);
  const sl = high ? last.price + buffer : last.price - buffer;
  let stage: ReversalSignal["stage"] = "alert";
  let entry: number | null = null;
  let entryT: number | null = null;
  const trigger = high ? Math.min(piv.o, piv.c) : Math.max(piv.o, piv.c);
  for (let k = i + 1; k < all.length; k++) {
    const c = all[k];
    if (high ? c.h > last.price : c.l < last.price) { stage = "cancelled"; break; }
    const isClosed = k < closed.length;
    if (entry == null && isClosed && (high ? c.c < trigger : c.c > trigger)) {
      entry = c.c; entryT = c.t; stage = "confirmed";
    }
  }
  if (stage === "confirmed") score += 15;
  score = Math.round(Math.max(5, Math.min(92, score)));
  const ref = entry ?? (forming?.c ?? closed.at(-1)!.c);
  const risk = Math.abs(ref - sl);
  const tp1 = high
    ? sellSide.find((p) => p < ref - risk) ?? null
    : buySide.find((p) => p > ref + risk) ?? null;
  const tp2 = risk > 0 ? (high ? ref - 3 * risk : ref + 3 * risk) : null;
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
  breaks: boolean;
  fvg: boolean;
  orderBlocks: boolean;
  liquidity: boolean;
  projection: boolean;
};

export const DEFAULT_SMC: SmcToggles = {
  structure: true,
  breaks: true,
  fvg: false,
  orderBlocks: false,
  liquidity: true,
  projection: true,
};

type Candle = { t: number; o: number; h: number; l: number; c: number; v?: number };

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
const SHOW_PROVISIONAL_PIVOTS = true;
const lockedLabels = new Map<string, string>();

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
): SmcOverlay {
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
  const pivotsLabelled = fractal.pivots.filter((p) => p.label.length === 2).map(lockLabel);
  const livePivots = computeLivePivots(fractalBars, forming ? toCandle(forming) : null, fractal.pivots)
    .map((p) => (p.confirmedByOpposite && p.label.length === 2 ? lockLabel(p) : p));
  const selectedPois = selectHighConfidencePois(poi, price);

  // Structure labels, breaks, trend and liquidity must all come from this same
  // confirmed 10-bar pivot set. Provisional tail pivots never create events.
  const breaks = fractal.breaks.map((b) => {
    const src = [...fractal.pivots]
      .reverse()
      .find((p) => p.index < b.index && Math.abs(p.price - b.level) < 1e-9);
    return { ...b, fromT: src?.t ?? fractalBars[Math.max(0, b.index - FRACTAL_RADIUS)].t };
  });
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
  const atr = (() => {
    const n = Math.min(14, all.length - 1);
    let sum = 0;
    for (let k = all.length - n; k < all.length; k++) {
      const c = all[k], p = all[k - 1];
      sum += Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c));
    }
    return n > 0 ? sum / n : 0;
  })();
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const legFor = (t: number, kind: "high" | "low") => {
    const i = idxOf.get(t);
    if (i == null) return;
    const piv = all[i];
    const range = piv.h - piv.l;
    if (!(range > 0)) return;
    const high = kind === "high";
    // 1) Rejection: wick at the extreme + where the swing candle closed.
    const wick = high ? piv.h - Math.max(piv.o, piv.c) : Math.min(piv.o, piv.c) - piv.l;
    const closeLoc = (piv.c - piv.l) / range;
    const rejectSide = clamp01(0.6 * (wick / range) + 0.4 * (high ? 1 - closeLoc : closeLoc));
    const rejection = high ? 1 - rejectSide : rejectSide;
    // 2) Reaction flow: volume-weighted close location + body direction.
    const end = Math.min(all.length - 1, i + FRACTAL_RADIUS);
    const avgV = all.slice(Math.max(0, i - 20), i + 1).reduce((s, c) => s + (c.v ?? 0), 0) / 21 || 1;
    let fb = 0, fw = 0, far = high ? Infinity : -Infinity;
    let streak = 0; // consecutive candles closing in the reversal direction
    let delta = 0; // cumulative body, signed + = buyers
    let climaxVol = 0; // biggest volume spike in the reaction
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
      if (volW > climaxVol) climaxVol = volW;
      // Momentum streak: does the reaction keep printing same-direction candles?
      const dir = c.c > c.o ? 1 : c.c < c.o ? -1 : 0;
      if (dir !== 0) {
        const revDir = high ? -1 : 1; // after a high, sellers = bearish candles
        streak = dir === revDir ? streak + 1 : 0;
      }
      far = high ? Math.min(far, c.l) : Math.max(far, c.h);
    }
    const bars = end - i;
    const evidence = Math.min(1, bars / FRACTAL_RADIUS);
    const flow = fw > 0 ? fb / fw : 0.5;
    // 3) Displacement: distance price travelled away from the level (2 ATR = full).
    const move = bars > 0 && atr > 0 ? clamp01((high ? piv.h - far : far - piv.l) / (2 * atr)) : 0;
    const disp = high ? 0.5 - move / 2 : 0.5 + move / 2;
    // 4) Momentum burst: signed cumulative delta normalised by bars, plus the
    //    longest same-direction streak. Strong one-sided reactions = strong side.
    const deltaNorm = bars > 0 ? clamp01(0.5 + delta / (bars * 2)) : 0.5;
    const streakNorm = clamp01(streak / 3); // 3+ consecutive candles = full
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
    const strength = Math.min(0.45, Math.max(0.06, agree, move * 0.35));
    buy = high ? 0.5 - strength : 0.5 + strength;
    pressure[t] = Math.round(clamp01(buy) * 100);
  };
  for (const p of pivotsLabelled) legFor(p.t, p.kind);
  for (const p of livePivots) legFor(p.t, p.kind);
  const reversal = computeReversalSignal(fractalBars, forming ? toCandle(forming) : null, [
    ...pivotsLabelled,
    ...livePivots,
  ], pressure, atr, buySide, sellSide);
  return {
    reversal,
    pressure,
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
    ctx.fillStyle = "rgba(255,255,255,0.92)";
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
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.roundRect?.(labelX - 6, labelY - 11, textWidth + 12, 22, 4);
    if (!ctx.roundRect) ctx.rect(labelX - 6, labelY - 11, textWidth + 12, 22);
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY + 1);
    ctx.textBaseline = "alphabetic";
  };

  if (toggles.fvg) {
    for (const gap of smc.fvgs) fairValueGap(gap);
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
    smc.buySide.slice(0, 1).forEach((p) => liq(p, "BSL", "#089981", true));
    smc.sellSide.slice(0, 1).forEach((p) => liq(p, "SSL", "#f23645", false));
    ctx.setLineDash([]);
  }
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
    const buy = smc.pressure?.[t];
    if (buy == null) return;
    const sell = 100 - buy;
    const bw = 92;
    const bh = 22;
    const bx = xx - bw / 2;
    const by = up ? yy - bh - 4 : yy + 20 + 4;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.strokeStyle = "#d6dae3";
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
      // Unconfirmed swings are not drawn: a label appears only once, final, on its own candle.
      if (!SHOW_PROVISIONAL_PIVOTS) continue;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
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
      ctx.fillStyle = "rgba(255,255,255,0.97)";
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
  const rv = smc.reversal;
  if (toggles.structure && rv && rv.stage !== "cancelled") {
    const x = pr.x(rv.t / 1000);
    const y = pr.y(rv.pivotPrice);
    if (x != null && y != null) {

      // Level lines to the right edge.
      const x0 = Math.max(0, pr.x((rv.entryT ?? rv.t) / 1000) ?? x);
      const line = (price: number | null, color: string, text: string, dash: number[]) => {
        if (price == null) return;
        const ly = pr.y(price);
        if (ly == null) return;
        ctx.setLineDash(dash);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.25;
        ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(pr.width, ly); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "700 11px 'JetBrains Mono', ui-monospace, monospace";
        const s = `${text} ${price.toFixed(2)}`;
        const w = ctx.measureText(s).width + 10;
        ctx.fillStyle = color;
        ctx.fillRect(pr.width - w - 70, ly - 8, w, 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(s, pr.width - w - 65, ly + 4);
      };
      if (rv.stage === "confirmed") {
        line(rv.entry, "#2962ff", "ENTRY", []);
        line(rv.tp1, "#089981", "TP1", [5, 3]);
        line(rv.tp2, "#089981", "TP2 1:3", [5, 3]);
      }
      line(rv.sl, "#f23645", "SL", [5, 3]);
      ctx.restore();
    }
  }
  ctx.restore();
}
