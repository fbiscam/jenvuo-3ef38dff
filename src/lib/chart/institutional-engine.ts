/**
 * Institutional reversal engine + JENVU AI (Pine v5) port.
 * Pure, deterministic, closed-candle only — nothing here looks ahead.
 */
import type { StructureBreak, StructurePivot } from "@/lib/analysis/market-structure-evidence";

export type ECandle = { t: number; o: number; h: number; l: number; c: number; v?: number };

/** Swing cluster size: 3 closed candles each side lock a swing. */
export const CLUSTER_RADIUS = 3;

/**
 * Volume Block Engine: B% = green volume / (green + red volume) over the
 * candles that formed the swing (3 before, the swing candle, 3 after).
 * Falls back to candle range as a volume proxy when the feed has no volume.
 */
export function clusterBuyerPercent(all: ECandle[], i: number, radius = CLUSTER_RADIUS): number | null {
  if (i < 0 || i >= all.length) return null;
  const slice = all.slice(Math.max(0, i - radius), Math.min(all.length, i + radius + 1));
  const hasVolume = slice.some((c) => (c.v ?? 0) > 0);
  let bull = 0;
  let bear = 0;
  for (const c of slice) {
    const w = hasVolume ? c.v ?? 0 : c.h - c.l;
    if (c.c > c.o) bull += w;
    else if (c.c < c.o) bear += w;
  }
  const total = bull + bear;
  if (!(total > 0)) return 50;
  return Math.round((bull / total) * 100);
}

export function atr14(candles: ECandle[], end = candles.length - 1, len = 14): number {
  const n = Math.min(len, end);
  if (n <= 0) return 0;
  let sum = 0;
  for (let k = end - n + 1; k <= end; k++) {
    const c = candles[k], p = candles[k - 1];
    sum += Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c));
  }
  return sum / n;
}

export type LiquiditySweep = { t: number; level: number; dir: "bullish" | "bearish"; fromT: number };

/**
 * Wick beyond a confirmed swing whose BODY closes back inside = liquidity
 * sweep (fake-out). Bullish sweep = below a low, bearish = above a high.
 */
export function detectLiquiditySweeps(closed: ECandle[], pivots: StructurePivot[]): LiquiditySweep[] {
  const out: LiquiditySweep[] = [];
  for (const p of pivots) {
    if (p.label.length !== 2) continue;
    for (let k = p.confirmedIndex + 1; k < closed.length; k++) {
      const c = closed[k];
      if (p.kind === "low") {
        if (c.c < p.price) break; // body close through = real break, not a sweep
        if (c.l < p.price) { out.push({ t: c.t, level: p.price, dir: "bullish", fromT: p.t }); break; }
      } else {
        if (c.c > p.price) break;
        if (c.h > p.price) { out.push({ t: c.t, level: p.price, dir: "bearish", fromT: p.t }); break; }
      }
    }
  }
  return out.sort((a, b) => a.t - b.t).slice(-6);
}

export type ExecutionSignal = {
  side: "buy" | "sell";
  stage: "waiting" | "triggered" | "invalidated";
  chochT: number;
  entry: number;
  entrySource: "equilibrium" | "zone";
  sl: number;
  tp1: number;
  tp2: number;
  rr1: number;
  rr2: number;
  triggeredT: number | null;
  blockedBySweep: boolean;
};

type Zone = { top: number; bottom: number; type: string };

/**
 * After a body-close CHoCH: entry = 50% of the breakout leg (or the aligned
 * OB/FVG edge inside that leg), SL = confirmed LL/HH -/+ 1×ATR14,
 * TP1 = nearest internal pivot with RR ≥ 1.5 (else 1.5R),
 * TP2 = major structural pivot with RR ≥ 3 (else 3R).
 */
export function computeExecutionSignal(
  closed: ECandle[],
  pivots: StructurePivot[],
  breaks: StructureBreak[],
  zones: Zone[],
  sweeps: LiquiditySweep[],
): ExecutionSignal | null {
  const choch = [...breaks].reverse().find((b) => b.type === "CHOCH" || b.type === "MSS");
  if (!choch || choch.index >= closed.length) return null;
  const buy = choch.dir === "bullish";
  const before = pivots.filter((p) => p.confirmedIndex <= choch.index && p.index < choch.index);
  const anchor = [...before].reverse().find((p) => p.kind === (buy ? "low" : "high"));
  if (!anchor) return null;
  // Breakout leg: anchor extreme → furthest extreme reached by the CHoCH candle.
  const b = closed[choch.index];
  const legFar = buy ? b.h : b.l;
  const legNear = anchor.price;
  const eq = (legFar + legNear) / 2;
  const zone = zones.find((z) => {
    const aligned = buy ? /DEMAND|BULL/.test(z.type) : /SUPPLY|BEAR/.test(z.type);
    const edge = buy ? z.top : z.bottom;
    return aligned && edge > Math.min(legNear, legFar) && edge < Math.max(legNear, legFar);
  });
  const entry = zone ? (buy ? zone.top : zone.bottom) : eq;
  const atr = atr14(closed, choch.index);
  const sl = buy ? anchor.price - atr : anchor.price + atr;
  const risk = Math.abs(entry - sl);
  if (!(risk > 0)) return null;
  const opp = pivots
    .filter((p) => p.kind === (buy ? "high" : "low"))
    .map((p) => p.price)
    .filter((px) => (buy ? px > entry : px < entry));
  const rr = (px: number) => Math.abs(px - entry) / risk;
  const near = [...opp].sort((a, b2) => (buy ? a - b2 : b2 - a));
  const tp1 = near.find((px) => rr(px) >= 1.5) ?? (buy ? entry + 1.5 * risk : entry - 1.5 * risk);
  const major = [...opp].sort((a, b2) => (buy ? b2 - a : a - b2)).find((px) => rr(px) >= 3);
  const tp2 = major ?? (buy ? entry + 3 * risk : entry - 3 * risk);
  let stage: ExecutionSignal["stage"] = "waiting";
  let triggeredT: number | null = null;
  for (let k = choch.index + 1; k < closed.length; k++) {
    const c = closed[k];
    if (buy ? c.c < sl : c.c > sl) { stage = "invalidated"; break; }
    if (triggeredT == null && (buy ? c.l <= entry : c.h >= entry)) { triggeredT = c.t; stage = "triggered"; }
  }
  const blockedBySweep = sweeps.some((s) => s.t > b.t && (buy ? s.dir === "bearish" : s.dir === "bullish"));
  return {
    side: buy ? "buy" : "sell", stage, chochT: b.t, entry, entrySource: zone ? "zone" : "equilibrium",
    sl, tp1, tp2, rr1: rr(tp1), rr2: rr(tp2), triggeredT, blockedBySweep,
  };
}

/** Lots = cash risk / (price distance × contract size). XAU = 100 oz/lot, BTC = 1. */
export function positionSize(balance: number, riskPct: number, entry: number, sl: number, contractSize: number) {
  const cashRisk = Math.max(0, balance) * Math.max(0, riskPct) / 100;
  const dist = Math.abs(entry - sl);
  const lots = dist > 0 && contractSize > 0 ? cashRisk / (dist * contractSize) : 0;
  return { cashRisk, lots: Math.floor(lots * 100) / 100 };
}

// ─────────────────────────── JENVU AI (Pine v5) ───────────────────────────
export type JenvuStrategy = "Default" | "Scalping" | "Intraday" | "Swing";
const PRESETS: Record<JenvuStrategy, { length: number; mult: number; filter: number }> = {
  Default: { length: 1, mult: 10, filter: 1 },
  Scalping: { length: 10, mult: 10, filter: 0.5 },
  Intraday: { length: 2, mult: 15, filter: 0.5 },
  Swing: { length: 10, mult: 5, filter: 1.2 },
};

export type JenvuSignal = { t: number; side: "long" | "short"; price: number };
export type JenvuMark = { t: number; kind: "top" | "bottom"; price: number };

const rma = (src: number[], len: number) => {
  const out: number[] = [];
  const a = 1 / len;
  src.forEach((x, i) => out.push(i === 0 ? x : a * x + (1 - a) * out[i - 1]));
  return out;
};
const ema = (src: number[], len: number) => {
  const out: number[] = [];
  const a = 2 / (len + 1);
  src.forEach((x, i) => out.push(i === 0 ? x : a * x + (1 - a) * out[i - 1]));
  return out;
};
const sma = (src: number[], len: number) =>
  src.map((_, i) => {
    const s = src.slice(Math.max(0, i - len + 1), i + 1);
    return s.reduce((x, y) => x + y, 0) / s.length;
  });
const wma = (src: number[], len: number) =>
  src.map((_, i) => {
    const s = src.slice(Math.max(0, i - len + 1), i + 1);
    let num = 0, den = 0;
    s.forEach((x, k) => { num += x * (k + 1); den += k + 1; });
    return num / den;
  });

/** ATR trailing-stop direction flips → LONG / SHORT (Pine `dir` logic). */
export function computeJenvuSignals(c: ECandle[], strategy: JenvuStrategy = "Default"): JenvuSignal[] {
  if (c.length < 3) return [];
  const { length, mult, filter } = PRESETS[strategy];
  const tr = c.map((x, i) => (i === 0 ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - c[i - 1].c), Math.abs(x.l - c[i - 1].c))));
  const atr = rma(tr, length).map((v) => v * mult);
  let longStop = NaN, shortStop = NaN, dir = 1;
  const out: JenvuSignal[] = [];
  for (let i = 0; i < c.length; i++) {
    const hl2 = (c[i].h + c[i].l) / 2;
    const ls = hl2 - atr[i] * filter;
    const ss = hl2 + atr[i] * filter;
    const lsPrev = Number.isNaN(longStop) ? ls : longStop;
    const ssPrev = Number.isNaN(shortStop) ? ss : shortStop;
    const prevClose = i > 0 ? c[i - 1].c : c[i].c;
    longStop = prevClose > lsPrev ? Math.max(ls, lsPrev) : ls;
    shortStop = prevClose < ssPrev ? Math.min(ss, ssPrev) : ss;
    const prevDir = dir;
    dir = dir === -1 && c[i].c > ssPrev ? 1 : dir === 1 && c[i].c < lsPrev ? -1 : dir;
    if (i > 0 && dir === 1 && prevDir === -1) out.push({ t: c[i].t, side: "long", price: longStop });
    if (i > 0 && dir === -1 && prevDir === 1) out.push({ t: c[i].t, side: "short", price: shortStop });
  }
  return out;
}

/** WaveTrend Top/Bottom crosses ("Don't Buy" / "Don't Sell"). */
export function computeTopBottom(c: ECandle[], sensitivity = 5): JenvuMark[] {
  if (c.length < 20) return [];
  const src = c.map((x) => x.c);
  const esa = ema(src, 5 * sensitivity);
  const d = ema(src.map((x, i) => Math.abs(x - esa[i])), 5 * sensitivity);
  const ci = src.map((x, i) => (d[i] > 0 ? (x - esa[i]) / (0.015 * d[i]) : 0));
  const wt1 = ema(ci, 10 * sensitivity);
  const wt2 = sma(wt1, 3);
  const out: JenvuMark[] = [];
  for (let i = 1; i < c.length; i++) {
    const up = wt1[i - 1] <= wt2[i - 1] && wt1[i] > wt2[i];
    const dn = wt1[i - 1] >= wt2[i - 1] && wt1[i] < wt2[i];
    if (up && wt2[i] <= -53) out.push({ t: c[i].t, kind: "bottom", price: c[i].l });
    if (dn && wt2[i] >= 53) out.push({ t: c[i].t, kind: "top", price: c[i].h });
  }
  return out;
}

/** Vortex cloud: average of SMA/EMA/WMA/VWMA/HMA/RMA at 10 and 40. */
export function computeVortexCloud(c: ECandle[], sens = 2): Array<{ t: number; fast: number; slow: number }> {
  if (c.length < 5) return [];
  const src = c.map((x) => x.c);
  const combo = (len: number) => {
    const L = Math.max(2, Math.round(len));
    const vol = c.map((x) => (x.v && x.v > 0 ? x.v : 1));
    const vwma = src.map((_, i) => {
      let n = 0, dsum = 0;
      for (let k = Math.max(0, i - L + 1); k <= i; k++) { n += src[k] * vol[k]; dsum += vol[k]; }
      return n / dsum;
    });
    const half = wma(src, Math.max(1, Math.round(L / 2)));
    const full = wma(src, L);
    const hma = wma(half.map((h, i) => 2 * h - full[i]), Math.max(1, Math.round(Math.sqrt(L))));
    const parts = [sma(src, L), ema(src, L), full, vwma, hma, rma(src, L)];
    return src.map((_, i) => parts.reduce((s, p) => s + p[i], 0) / parts.length);
  };
  const f = combo(10 * (sens / 2));
  const s = combo(40 * (sens / 2));
  return c.map((x, i) => ({ t: x.t, fast: f[i], slow: s[i] }));
}

/** CSV (time,open,high,low,close[,volume]) → candles. Time = epoch s/ms or ISO. */
export function parseCandleCsv(text: string): ECandle[] {
  const rows = text.trim().split(/\r?\n/);
  const out: ECandle[] = [];
  for (const row of rows) {
    const cols = row.split(/[,;\t]/).map((s) => s.trim());
    if (cols.length < 5) continue;
    const [ts, o, h, l, cl, v] = cols;
    const num = Number(ts);
    const t = Number.isFinite(num) ? (num < 1e12 ? num * 1000 : num) : Date.parse(ts);
    const bar = { t, o: +o, h: +h, l: +l, c: +cl, v: v != null ? +v : undefined };
    if ([bar.t, bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)) out.push(bar);
  }
  return out.sort((a, b) => a.t - b.t);
}

export type BacktestResult = { trades: number; wins: number; losses: number; tp2Hits: number; winRate: number; netR: number };

/**
 * Walk-forward: at every closed candle recompute the engine with only past
 * data; when a signal triggers, resolve it forward (SL first if same candle).
 * TP1 closes 50% and moves the rest to break-even.
 */
export function backtestExecution(
  candles: ECandle[],
  analyse: (history: ECandle[]) => ExecutionSignal | null,
): BacktestResult {
  let trades = 0, wins = 0, losses = 0, tp2Hits = 0, netR = 0;
  const seen = new Set<number>();
  for (let n = 60; n < candles.length; n++) {
    const sig = analyse(candles.slice(0, n));
    if (!sig || sig.stage !== "triggered" || sig.blockedBySweep || sig.triggeredT == null) continue;
    if (seen.has(sig.chochT)) continue;
    seen.add(sig.chochT);
    const start = candles.findIndex((c) => c.t === sig.triggeredT);
    const buy = sig.side === "buy";
    let hitTp1 = false;
    let r = 0;
    let done = false;
    for (let k = start + 1; k < candles.length && !done; k++) {
      const c = candles[k];
      const stop = hitTp1 ? sig.entry : sig.sl;
      if (buy ? c.l <= stop : c.h >= stop) { r += hitTp1 ? 0 : -1; done = true; break; }
      if (!hitTp1 && (buy ? c.h >= sig.tp1 : c.l <= sig.tp1)) { hitTp1 = true; r += 0.5 * sig.rr1; }
      if (hitTp1 && (buy ? c.h >= sig.tp2 : c.l <= sig.tp2)) { r += 0.5 * sig.rr2; tp2Hits++; done = true; }
    }
    if (!done && !hitTp1) continue; // unresolved
    trades++;
    if (r > 0) wins++; else losses++;
    netR += r;
  }
  return { trades, wins, losses, tp2Hits, winRate: trades ? Math.round((wins / trades) * 100) : 0, netR: Math.round(netR * 100) / 100 };
}
