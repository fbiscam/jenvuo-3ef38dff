// Deterministic ICT/SMC analysis engine.
// No AI. Pure math on OHLCV. The LLM only narrates what this produces.

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export type Swing = { i: number; t: number; price: number; kind: "high" | "low" };

export type FVG = {
  fromTime: number; toTime: number;
  priceLow: number; priceHigh: number;
  kind: "bullish" | "bearish";
  mitigated: boolean;
  size: number;
};

export type OB = {
  fromTime: number; toTime: number;
  priceLow: number; priceHigh: number;
  kind: "demand" | "supply";
  mitigated: boolean;
};

export type StructureEvent = {
  kind: "BOS" | "CHoCH";
  dir: "bullish" | "bearish";
  fromTime: number; toTime: number;
  price: number;
};

export type LiquidityPool = {
  price: number;
  side: "buy" | "sell";  // BSL above / SSL below
  label: string;
  swept: boolean;
};

export type TFAnalysis = {
  trend: "bullish" | "bearish" | "ranging";
  swings: Swing[];
  lastStructure: StructureEvent | null;
  fvgs: FVG[];
  obs: OB[];
  swingHigh: number;
  swingLow: number;
  equilibrium: number;
};

// ---------- swing / structure ----------

export function findSwings(candles: Candle[], lookback = 3): Swing[] {
  const out: Swing[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true, isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].h <= candles[i - j].h || candles[i].h <= candles[i + j].h) isHigh = false;
      if (candles[i].l >= candles[i - j].l || candles[i].l >= candles[i + j].l) isLow = false;
    }
    if (isHigh) out.push({ i, t: Math.floor(candles[i].t / 1000), price: candles[i].h, kind: "high" });
    if (isLow) out.push({ i, t: Math.floor(candles[i].t / 1000), price: candles[i].l, kind: "low" });
  }
  return out;
}

export function detectStructure(candles: Candle[], swings: Swing[]): { events: StructureEvent[]; trend: TFAnalysis["trend"] } {
  const events: StructureEvent[] = [];
  if (swings.length < 4) return { events, trend: "ranging" };

  let trend: TFAnalysis["trend"] = "ranging";
  let lastHigh: Swing | null = null;
  let lastLow: Swing | null = null;
  let lastTrend: "bullish" | "bearish" | "ranging" = "ranging";

  for (const s of swings) {
    if (s.kind === "high") {
      if (lastHigh && s.price > lastHigh.price) {
        const kind = lastTrend === "bearish" ? "CHoCH" : "BOS";
        events.push({ kind, dir: "bullish", fromTime: lastHigh.t, toTime: s.t, price: s.price });
        lastTrend = "bullish";
      }
      lastHigh = s;
    } else {
      if (lastLow && s.price < lastLow.price) {
        const kind = lastTrend === "bullish" ? "CHoCH" : "BOS";
        events.push({ kind, dir: "bearish", fromTime: lastLow.t, toTime: s.t, price: s.price });
        lastTrend = "bearish";
      }
      lastLow = s;
    }
  }
  trend = lastTrend;
  return { events, trend };
}

// ---------- FVG ----------

export function detectFVGs(candles: Candle[], currentPrice: number): FVG[] {
  const out: FVG[] = [];
  for (let i = 2; i < candles.length; i++) {
    const a = candles[i - 2], c = candles[i];
    // Bullish FVG: a.high < c.low → gap between
    if (a.h < c.l) {
      const lo = a.h, hi = c.l;
      const mitigated = candles.slice(i + 1).some(k => k.l <= lo);
      out.push({
        fromTime: Math.floor(a.t / 1000),
        toTime: Math.floor(c.t / 1000),
        priceLow: lo, priceHigh: hi, kind: "bullish", mitigated, size: hi - lo,
      });
    }
    // Bearish FVG: a.low > c.high
    if (a.l > c.h) {
      const lo = c.h, hi = a.l;
      const mitigated = candles.slice(i + 1).some(k => k.h >= hi);
      out.push({
        fromTime: Math.floor(a.t / 1000),
        toTime: Math.floor(c.t / 1000),
        priceLow: lo, priceHigh: hi, kind: "bearish", mitigated, size: hi - lo,
      });
    }
  }
  // Keep last 10 unmitigated, sorted by closeness to price
  return out
    .filter(f => !f.mitigated)
    .sort((a, b) => Math.abs(((a.priceLow + a.priceHigh) / 2) - currentPrice) - Math.abs(((b.priceLow + b.priceHigh) / 2) - currentPrice))
    .slice(0, 10);
}

// ---------- Order Blocks ----------

export function detectOBs(candles: Candle[], structure: StructureEvent[]): OB[] {
  const out: OB[] = [];
  // For each BOS event, the OB = last opposing-color candle before the impulsive move
  for (const ev of structure.slice(-12)) {
    const idx = candles.findIndex(c => Math.floor(c.t / 1000) === ev.toTime);
    if (idx < 2) continue;
    if (ev.dir === "bullish") {
      // last bearish candle before idx
      for (let k = idx - 1; k >= Math.max(0, idx - 8); k--) {
        if (candles[k].c < candles[k].o) {
          const lo = candles[k].l, hi = candles[k].o;
          const mitigated = candles.slice(idx + 1).some(c => c.l <= lo);
          out.push({
            fromTime: Math.floor(candles[k].t / 1000),
            toTime: Math.floor(candles[Math.min(candles.length - 1, k + 3)].t / 1000),
            priceLow: lo, priceHigh: hi, kind: "demand", mitigated,
          });
          break;
        }
      }
    } else {
      for (let k = idx - 1; k >= Math.max(0, idx - 8); k--) {
        if (candles[k].c > candles[k].o) {
          const lo = candles[k].o, hi = candles[k].h;
          const mitigated = candles.slice(idx + 1).some(c => c.h >= hi);
          out.push({
            fromTime: Math.floor(candles[k].t / 1000),
            toTime: Math.floor(candles[Math.min(candles.length - 1, k + 3)].t / 1000),
            priceLow: lo, priceHigh: hi, kind: "supply", mitigated,
          });
          break;
        }
      }
    }
  }
  return out.filter(o => !o.mitigated).slice(-6);
}

// ---------- Liquidity ----------

export function buildLiquidityPools(htf: Candle[], ltf: Candle[]): LiquidityPool[] {
  const out: LiquidityPool[] = [];
  if (htf.length < 24 || ltf.length < 12) return out;
  const last = ltf[ltf.length - 1].c;
  const tol = last * 0.0005;

  // Prior day (last 24 1H candles)
  const prevDay = htf.slice(-24);
  const pdh = Math.max(...prevDay.map(c => c.h));
  const pdl = Math.min(...prevDay.map(c => c.l));
  out.push({ price: pdh, side: "buy", label: "PDH", swept: ltf.slice(-6).some(c => c.h >= pdh - tol) });
  out.push({ price: pdl, side: "sell", label: "PDL", swept: ltf.slice(-6).some(c => c.l <= pdl + tol) });

  // Asia range (00-07 UTC of today)
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const asia = htf.filter(c => c.t >= today.getTime() && c.t < today.getTime() + 7 * 3600_000);
  if (asia.length) {
    const ah = Math.max(...asia.map(c => c.h));
    const al = Math.min(...asia.map(c => c.l));
    out.push({ price: ah, side: "buy", label: "Asia High", swept: ltf.slice(-12).some(c => c.h >= ah - tol) });
    out.push({ price: al, side: "sell", label: "Asia Low", swept: ltf.slice(-12).some(c => c.l <= al + tol) });
  }

  // HTF swing extremes — dynamic swept check (was hard-coded false, causing false no_sweep vetoes)
  const sh = Math.max(...htf.slice(-80).map(c => c.h));
  const sl = Math.min(...htf.slice(-80).map(c => c.l));
  out.push({ price: sh, side: "buy",  label: "HTF Swing High", swept: ltf.slice(-24).some(c => c.h >= sh - tol) });
  out.push({ price: sl, side: "sell", label: "HTF Swing Low",  swept: ltf.slice(-24).some(c => c.l <= sl + tol) });

  return out;
}

// ---------- Per-TF analysis ----------

export function analyzeTF(candles: Candle[]): TFAnalysis {
  const swings = findSwings(candles, 3);
  const { events, trend } = detectStructure(candles, swings);
  const last = candles[candles.length - 1];
  const fvgs = detectFVGs(candles, last.c);
  const obs = detectOBs(candles, events);
  const recent = candles.slice(-80);
  const sh = Math.max(...recent.map(c => c.h));
  const sl = Math.min(...recent.map(c => c.l));
  return {
    trend,
    swings,
    lastStructure: events[events.length - 1] ?? null,
    fvgs, obs,
    swingHigh: sh, swingLow: sl,
    equilibrium: (sh + sl) / 2,
  };
}

// ---------- Killzone ----------

export function killzoneOf(d = new Date()): { session: string; killzone: string; inKillzone: boolean } {
  const h = d.getUTCHours();
  let session = "Off-Session";
  if (h < 7) session = "Asia"; else if (h < 12) session = "London"; else if (h < 17) session = "New York AM"; else if (h < 21) session = "New York PM";
  let kz = "Outside Killzone"; let inK = false;
  if (h >= 7 && h < 10) { kz = "London Killzone"; inK = true; }
  else if (h >= 12 && h < 15) { kz = "NY AM Killzone"; inK = true; }
  else if (h >= 17 && h < 20) { kz = "NY PM Killzone"; inK = true; }
  else if (h >= 0 && h < 4) { kz = "Asia Killzone"; inK = true; }
  return { session, killzone: kz, inKillzone: inK };
}

// ---------- Trade builder ----------

export type BuiltTrade = {
  direction: "BUY" | "SELL" | "WAIT";
  entryType: "MARKET" | "LIMIT";
  entry: number; sl: number; tp: number; rr: number;
  tp1?: number; tp2?: number; tp3?: number;
  zone: { kind: "OB" | "FVG" | "OTE"; priceLow: number; priceHigh: number } | null;
  reason: string;
  notes?: string[];
};


// Per-asset risk profile. Each asset class has different typical wick sizes,
// spread, and news volatility — using the same buffer for XAU and EURUSD is wrong.
const RISK_PROFILE: Record<
  "crypto" | "metal" | "forex" | "index" | "stock",
  {
    pctBuffer: number;
    minRiskPct: number;
    atrMult: number;
    maxDistPct: number;
    entryWindowPct: number;
    maxRiskPct: number;
  }
> = {
  crypto: { pctBuffer: 0.0025, minRiskPct: 0.0030, atrMult: 0.90, maxDistPct: 0.0250, entryWindowPct: 0.0025, maxRiskPct: 0.0250 },
  metal:  { pctBuffer: 0.0012, minRiskPct: 0.0018, atrMult: 0.65, maxDistPct: 0.0150, entryWindowPct: 0.0009, maxRiskPct: 0.0120 },
  forex:  { pctBuffer: 0.0005, minRiskPct: 0.0008, atrMult: 0.45, maxDistPct: 0.0090, entryWindowPct: 0.0006, maxRiskPct: 0.0080 },
  index:  { pctBuffer: 0.0010, minRiskPct: 0.0015, atrMult: 0.65, maxDistPct: 0.0150, entryWindowPct: 0.0010, maxRiskPct: 0.0150 },
  stock:  { pctBuffer: 0.0015, minRiskPct: 0.0020, atrMult: 0.65, maxDistPct: 0.0200, entryWindowPct: 0.0015, maxRiskPct: 0.0180 },

};

function smartPrice(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const a = Math.abs(n);
  const d = a >= 100 ? 2 : a >= 1 ? 4 : a >= 0.01 ? 5 : a >= 0.0001 ? 7 : 10;
  return n.toFixed(d);
}

export function buildTrade(
  htf: TFAnalysis,
  ltf: TFAnalysis,
  pools: LiquidityPool[],
  lastPrice: number,
  atr?: number, // optional ATR — enables volatility-adaptive SL buffer
  assetKind: "crypto" | "metal" | "forex" | "index" | "stock" = "metal",
): BuiltTrade {
  const profile = RISK_PROFILE[assetKind] ?? RISK_PROFILE.metal;
  // Direction from HTF + LTF agreement
  const dir: "BUY" | "SELL" | "WAIT" =
    htf.trend === "bullish" && (ltf.trend === "bullish" || ltf.trend === "ranging") ? "BUY" :
    htf.trend === "bearish" && (ltf.trend === "bearish" || ltf.trend === "ranging") ? "SELL" : "WAIT";

  if (dir === "WAIT") {
    return { direction: "WAIT", entry: 0, sl: 0, tp: 0, rr: 0, zone: null, reason: "HTF/LTF disagree — no clean trend." };
  }

  // Pick best zone: UNMITIGATED LTF FVG/OB on the trade side, closest to LIVE price.
  // We no longer emit limit entries far away from market. If price is not at/near
  // the POI, the engine returns WAIT instead of a misleading entry/SL/TP ticket.
  const candidates: Array<{ kind: "OB" | "FVG"; priceLow: number; priceHigh: number; dist: number }> = [];
  const distanceFromExecutionZone = (lo: number, hi: number) => {
    if (lastPrice >= lo && lastPrice <= hi) return 0;
    return dir === "BUY" ? Math.max(0, lastPrice - hi) : Math.max(0, lo - lastPrice);
  };
  for (const f of ltf.fvgs) {
    if (f.mitigated) continue;
    const ok = dir === "BUY"
      ? f.kind === "bullish" && lastPrice >= f.priceLow
      : f.kind === "bearish" && lastPrice <= f.priceHigh;
    if (ok) candidates.push({ kind: "FVG", priceLow: f.priceLow, priceHigh: f.priceHigh, dist: distanceFromExecutionZone(f.priceLow, f.priceHigh) });
  }
  for (const o of ltf.obs) {
    if (o.mitigated) continue;
    const ok = dir === "BUY"
      ? o.kind === "demand" && lastPrice >= o.priceLow
      : o.kind === "supply" && lastPrice <= o.priceHigh;
    if (ok) candidates.push({ kind: "OB", priceLow: o.priceLow, priceHigh: o.priceHigh, dist: distanceFromExecutionZone(o.priceLow, o.priceHigh) });
  }
  candidates.sort((a, b) => a.dist - b.dist);
  const zone = candidates[0] ?? null;

  if (!zone) {
    return { direction: "WAIT", entry: 0, sl: 0, tp: 0, rr: 0, zone: null, reason: "No fresh (unmitigated) OB/FVG aligned with bias." };
  }

  const notes: string[] = [];

  // Reject stale / distant zones. A valid signal must be executable around the
  // current live tick; otherwise it is only a watch-zone and should be WAIT.
  const zoneMid = (zone.priceLow + zone.priceHigh) / 2;
  const zoneDistance = distanceFromExecutionZone(zone.priceLow, zone.priceHigh);
  const distPct = zoneDistance / lastPrice;
  if (distPct > profile.maxDistPct) {
    return { direction: "WAIT", entry: 0, sl: 0, tp: 0, rr: 0, zone: null, reason: `Nearest fresh zone is ${(distPct * 100).toFixed(2)}% from live price — wait, do not chase.` };
  }

  const actionableWindow = Math.max(lastPrice * profile.entryWindowPct, atr && atr > 0 ? atr * 0.20 : 0);
  if (zoneDistance > actionableWindow) {
    return {
      direction: "WAIT",
      entry: 0, sl: 0, tp: 0, rr: 0, zone: null,
      reason: `Live price ${smartPrice(lastPrice)} is not inside the fresh ${zone.kind} (${smartPrice(zone.priceLow)}–${smartPrice(zone.priceHigh)}). Wait for a tap before entry.`,
    };
  }

  // Entry = the current live executable price, not an old zone midpoint.
  const entry = lastPrice;
  const zoneHeight = Math.abs(zone.priceHigh - zone.priceLow);

  // SL buffer — asset-aware. max(pct × price, atrMult × ATR, 0.5 × zoneHeight)
  const pctBuffer = lastPrice * profile.pctBuffer;
  const atrBuffer = atr && atr > 0 ? atr * profile.atrMult : 0;
  const zoneBuffer = zoneHeight * 0.5;
  const buffer = Math.max(pctBuffer, atrBuffer, zoneBuffer);
  let sl = dir === "BUY" ? zone.priceLow - buffer : zone.priceHigh + buffer;

  // Enforce MINIMUM risk distance so tickets don't get wicked out on normal noise.
  const minRisk = lastPrice * profile.minRiskPct;
  let risk = Math.abs(entry - sl);
  if (risk < minRisk) {
    sl = dir === "BUY" ? entry - minRisk : entry + minRisk;
    risk = minRisk;
    notes.push("SL widened to minimum safe distance");
  }

  const maxRisk = lastPrice * profile.maxRiskPct;
  if (risk > maxRisk) {
    return {
      direction: "WAIT", entry: 0, sl: 0, tp: 0, rr: 0, zone: null,
      reason: `Risk from live entry to protected stop is ${(risk / lastPrice * 100).toFixed(2)}%, too wide for ${assetKind}. Wait for a tighter re-entry.`,
    };
  }

  // TP1/2/3 based on R-multiples first, so partials always exist.
  const tp1 = dir === "BUY" ? entry + risk * 1 : entry - risk * 1;
  const tp2 = dir === "BUY" ? entry + risk * 2 : entry - risk * 2;

  // Final TP = nearest unswept opposing liquidity pool, but CAPPED at 3R and floored at 2R.
  const targetSide: "buy" | "sell" = dir === "BUY" ? "buy" : "sell";
  const liquidityTargets = pools
    .filter(p => p.side === targetSide && !p.swept && (dir === "BUY" ? p.price > entry : p.price < entry))
    .sort((a, b) => Math.abs(a.price - entry) - Math.abs(b.price - entry));
  const nearestLiquidity = liquidityTargets[0]?.price;

  const rMax = dir === "BUY" ? entry + risk * 3 : entry - risk * 3;
  const rMin = dir === "BUY" ? entry + risk * 2 : entry - risk * 2;

  let tp: number;
  if (nearestLiquidity == null) {
    tp = rMax;
  } else {
    // Use liquidity target only if it lies between 2R and 3R (realistic).
    const distR = Math.abs(nearestLiquidity - entry) / risk;
    if (distR < 2) {
      tp = rMin;
      notes.push("TP extended to 2R (liquidity target too close)");
    } else if (distR > 3) {
      tp = rMax;
      notes.push("TP capped at 3R (liquidity target too far)");
    } else {
      tp = nearestLiquidity;
    }
  }

  const reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;
  const tp3 = tp;

  return {
    direction: dir,
    entry, sl, tp, rr,
    tp1, tp2, tp3,
    zone: { kind: zone.kind, priceLow: zone.priceLow, priceHigh: zone.priceHigh },
    reason: `${dir} from live price ${smartPrice(entry)} near fresh ${zone.kind} (${smartPrice(zone.priceLow)}–${smartPrice(zone.priceHigh)}), SL beyond the protected zone, TP ${liquidityTargets[0]?.label ? "at " + liquidityTargets[0].label : "at " + rr.toFixed(1) + "R"}.`,
    notes: notes.length ? notes : undefined,
  };
}


// ---------- Score (asset-aware weighted + hard-veto gates) ----------

export type AssetKind = "crypto" | "metal" | "forex" | "index" | "stock";
export type ScoreFactor = { key: string; label: string; weight: number; pass: boolean; detail: string };
export type VetoResult = { key: string; label: string; reason: string };

// Per-asset factor weights. Factors that don't apply to a class get weight 0
// and are dropped from the score (the remaining weights are re-normalised to 100).
// New factors: structure (BOS/CHoCH quality), smt (correlation divergence), session_align (native session for this pair).
const FACTOR_WEIGHTS: Record<AssetKind, Record<string, number>> = {
  metal:  { bias: 20, sweep: 15, zone: 12, pd: 8,  killzone: 10, dxy: 10, rr: 8,  structure: 8, smt: 5,  session_align: 4 },
  forex:  { bias: 20, sweep: 15, zone: 12, pd: 8,  killzone: 12, dxy: 6,  rr: 8,  structure: 8, smt: 7,  session_align: 4 },
  index:  { bias: 22, sweep: 15, zone: 12, pd: 8,  killzone: 12, dxy: 0,  rr: 8,  structure: 10, smt: 8, session_align: 5 },
  crypto: { bias: 25, sweep: 20, zone: 15, pd: 8,  killzone: 0,  dxy: 0,  rr: 12, structure: 12, smt: 5, session_align: 3 },
  stock:  { bias: 22, sweep: 15, zone: 12, pd: 8,  killzone: 12, dxy: 0,  rr: 8,  structure: 10, smt: 8, session_align: 5 },
};

export function scoreSetup(args: {
  trade: BuiltTrade;
  htf: TFAnalysis;
  ltf: TFAnalysis;
  pools: LiquidityPool[];
  inKillzone: boolean;
  imminentHighNews: boolean;
  dxyConfirms: boolean | null;     // null = unknown / N/A
  lastPrice: number;
  kind: AssetKind;
  // ---- optional new signals (safe defaults) ----
  structureQuality?: number | null;  // 0..1 quality of last HTF BOS/CHoCH (impulse vs choppy)
  smtDivergence?: boolean | null;    // true = correlated instrument diverges in our favor
  nativeSession?: boolean | null;    // true = current killzone is the native/prime session for this pair
  zoneMitigated?: boolean;           // true = entry zone already tagged
}): {
  score: number;
  grade: "A+" | "A" | "B" | "C";
  factors: ScoreFactor[];
  vetos: VetoResult[];
} {
  const {
    trade, htf, ltf, pools, inKillzone, imminentHighNews, dxyConfirms, lastPrice, kind,
    structureQuality, smtDivergence, nativeSession, zoneMitigated,
  } = args;
  const w = FACTOR_WEIGHTS[kind] ?? FACTOR_WEIGHTS.metal;
  const f: ScoreFactor[] = [];
  const vetos: VetoResult[] = [];
  const dir = trade.direction;

  // ---- HARD VETO GATES (any trigger → downgrade, but no longer flat-cap at 40) ----
  if (dir !== "WAIT") {
    // 1. HTF/LTF bias conflict
    if (htf.trend !== "ranging" && ltf.trend !== "ranging" && htf.trend !== ltf.trend) {
      vetos.push({ key: "bias_conflict", label: "HTF/LTF bias conflict", reason: `HTF ${htf.trend} vs LTF ${ltf.trend}` });
    }
    // 2. No liquidity sweep before entry — skip for crypto (24/7, sweeps unreliable)
    if (kind !== "crypto") {
      const anySwept = pools.some(p => p.swept && (dir === "BUY" ? p.side === "sell" : p.side === "buy"));
      if (!anySwept) {
        vetos.push({ key: "no_sweep", label: "No sweep before entry", reason: "Institutional entries usually follow a liquidity grab" });
      }
    }
    // 3. Entry zone already mitigated
    if (zoneMitigated === true) {
      vetos.push({ key: "mitigated", label: "Entry zone already mitigated", reason: "Zone was tagged — imbalance filled" });
    }
    // 4. High-impact news imminent
    if (imminentHighNews) {
      vetos.push({ key: "news", label: "High-impact news imminent", reason: "News event within 60m — stand aside" });
    }
    // 5. R:R < 1.5 (engine already floors at 2R; anything below 1.5 is genuinely bad)
    if (trade.rr < 1.5) {
      vetos.push({ key: "rr_low", label: "R:R below 1.5", reason: `Only 1:${trade.rr.toFixed(2)} — not worth the risk` });
    }
  }

  const push = (key: string, label: string, pass: boolean, detail: string) => {
    const weight = w[key] ?? 0;
    if (weight > 0) f.push({ key, label, weight, pass, detail });
  };

  push("bias", "HTF + LTF bias aligned",
    dir !== "WAIT" && htf.trend === (dir === "BUY" ? "bullish" : "bearish"),
    `HTF: ${htf.trend} · LTF: ${ltf.trend}`);

  const sweptPool = pools.find(p => p.swept && (dir === "BUY" ? p.side === "sell" : p.side === "buy"));
  push("sweep", "Liquidity sweep before entry", !!sweptPool,
    sweptPool ? `${sweptPool.label} swept @ ${sweptPool.price.toFixed(2)}` : "No recent sweep detected");

  push("zone", "Unmitigated OB/FVG at entry", !!trade.zone && zoneMitigated !== true,
    trade.zone ? `${trade.zone.kind} ${trade.zone.priceLow.toFixed(2)}–${trade.zone.priceHigh.toFixed(2)}` : "No clean zone");

  const inPremium = lastPrice > htf.equilibrium;
  const pdOk = dir === "BUY" ? !inPremium : dir === "SELL" ? inPremium : false;
  push("pd", "Premium/Discount correct side", pdOk,
    `Price is in ${inPremium ? "premium" : "discount"}, trade is ${dir}`);

  push("killzone", kind === "crypto" ? "Session momentum (24/7)" : "Inside active killzone",
    kind === "crypto" ? true : inKillzone,
    kind === "crypto" ? "Crypto trades 24/7" : (inKillzone ? "Killzone active" : "Outside killzone"));

  // DXY — only score when data available; unknown = don't penalise
  if (dxyConfirms !== null && dxyConfirms !== undefined) {
    push("dxy", "DXY correlation confirms", dxyConfirms === true,
      dxyConfirms ? "DXY moving inverse" : "DXY not confirming");
  }

  push("rr", "Clean R:R ≥ 1:3", trade.rr >= 3, `R:R 1:${trade.rr.toFixed(2)}`);

  // Structure quality — only score when computable
  if (structureQuality !== null && structureQuality !== undefined) {
    push("structure", "Clean HTF structure (impulse BOS/CHoCH)",
      structureQuality >= 0.6,
      `Impulse strength ${(structureQuality * 100).toFixed(0)}%`);
  }

  // SMT — only score when computable
  if (smtDivergence !== null && smtDivergence !== undefined) {
    push("smt", "SMT divergence with correlated pair",
      smtDivergence === true,
      smtDivergence ? "Correlated pair diverges (institutional footprint)" : "No SMT divergence");
  }

  // Session — only score when computable
  if (nativeSession !== null && nativeSession !== undefined) {
    push("session_align", "Native/prime session for this pair",
      nativeSession === true,
      nativeSession ? "Trading in this pair's prime hours" : "Off-hours for this pair");
  }

  const totalWeight = f.reduce((s, x) => s + x.weight, 0) || 1;
  const earned = f.reduce((s, x) => s + (x.pass ? x.weight : 0), 0);
  let score = Math.round((earned / totalWeight) * 100);
  if (imminentHighNews) score = Math.min(score, 60);

  // Apply vetos — soft deduction, not a flat cap. Multiple vetoes stack.
  if (vetos.length > 0) {
    score = Math.max(30, score - vetos.length * 15);
  }

  // Grade thresholds unchanged; multi-veto forces C.
  const grade: "A+" | "A" | "B" | "C" =
    vetos.length >= 2 ? "C" :
    score >= 88 ? "A+" :
    score >= 75 ? "A" :
    score >= 60 ? "B" : "C";

  return { score, grade, factors: f, vetos };
}

// ============================================================
// EXPANDED ICT/SMC DETECTORS
// ============================================================

// ---------- ATR (volatility) ----------
export function computeATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
  }
  const slice = trs.slice(-period);
  return slice.reduce((s, x) => s + x, 0) / slice.length;
}

// ---------- Breaker Blocks ----------
// A breaker = OB whose extreme was broken then price returned to it,
// now acting as flipped support/resistance.
export type Breaker = {
  fromTime: number; toTime: number;
  priceLow: number; priceHigh: number;
  kind: "bullish" | "bearish"; // bullish breaker = old supply flipped demand
};

export function detectBreakerBlocks(candles: Candle[], structure: StructureEvent[]): Breaker[] {
  const out: Breaker[] = [];
  // Look at last few structure events. A CHoCH implies the prior OB flipped.
  for (const ev of structure.slice(-8)) {
    if (ev.kind !== "CHoCH") continue;
    const idx = candles.findIndex(c => Math.floor(c.t / 1000) === ev.toTime);
    if (idx < 4) continue;
    // Find the last opposing candle before the CHoCH — that becomes the breaker.
    for (let k = idx - 1; k >= Math.max(0, idx - 10); k--) {
      const c = candles[k];
      if (ev.dir === "bullish" && c.c < c.o) {
        out.push({
          fromTime: Math.floor(c.t / 1000),
          toTime: Math.floor(candles[Math.min(candles.length - 1, k + 3)].t / 1000),
          priceLow: c.l, priceHigh: c.o, kind: "bullish",
        });
        break;
      }
      if (ev.dir === "bearish" && c.c > c.o) {
        out.push({
          fromTime: Math.floor(c.t / 1000),
          toTime: Math.floor(candles[Math.min(candles.length - 1, k + 3)].t / 1000),
          priceLow: c.o, priceHigh: c.h, kind: "bearish",
        });
        break;
      }
    }
  }
  return out.slice(-4);
}

// ---------- Inverted FVG (IFVG) ----------
// An FVG that got violated → now acts as opposite bias imbalance.
export type IFVG = FVG & { originalKind: "bullish" | "bearish" };

export function detectIFVGs(candles: Candle[], fvgs: FVG[]): IFVG[] {
  const out: IFVG[] = [];
  for (const g of fvgs) {
    // If the gap has been fully violated (price closed through both edges), invert its bias.
    const gapIdx = candles.findIndex(c => Math.floor(c.t / 1000) === g.toTime);
    if (gapIdx < 0) continue;
    const after = candles.slice(gapIdx + 1);
    const violated = g.kind === "bullish"
      ? after.some(c => c.c < g.priceLow)
      : after.some(c => c.c > g.priceHigh);
    if (violated) {
      out.push({
        ...g,
        originalKind: g.kind,
        kind: g.kind === "bullish" ? "bearish" : "bullish", // flipped bias
      });
    }
  }
  return out.slice(-4);
}

// ---------- Structure quality (impulse vs choppy) ----------
// Returns 0..1. Higher = cleaner impulsive move on last BOS/CHoCH.
export function computeStructureQuality(candles: Candle[], structure: StructureEvent[]): number {
  const last = structure[structure.length - 1];
  if (!last) return 0;
  const idx = candles.findIndex(c => Math.floor(c.t / 1000) === last.toTime);
  if (idx < 5) return 0;
  // Look at the 5 candles that produced the move — measure body:range ratio.
  const impulse = candles.slice(Math.max(0, idx - 5), idx + 1);
  let bodyTotal = 0, rangeTotal = 0;
  for (const c of impulse) {
    bodyTotal += Math.abs(c.c - c.o);
    rangeTotal += (c.h - c.l);
  }
  if (rangeTotal === 0) return 0;
  return Math.min(1, bodyTotal / rangeTotal);
}

// ---------- SMT Divergence ----------
// If two correlated instruments (Gold vs DXY, EURUSD vs GBPUSD, JPY crosses vs USDJPY)
// print divergent highs/lows in the recent window → institutional footprint.
export function detectSMTDivergence(
  main: Candle[],
  correlated: Candle[],
  inverse: boolean, // true when they should move opposite (Gold↔DXY, EUR↔DXY)
): boolean | null {
  if (main.length < 10 || correlated.length < 10) return null;
  const n = Math.min(main.length, correlated.length, 20);
  const mainSlice = main.slice(-n);
  const corrSlice = correlated.slice(-n);
  const mainHigh = Math.max(...mainSlice.map(c => c.h));
  const mainLow = Math.min(...mainSlice.map(c => c.l));
  const corrHigh = Math.max(...corrSlice.map(c => c.h));
  const corrLow = Math.min(...corrSlice.map(c => c.l));
  const mainHighIdx = mainSlice.findIndex(c => c.h === mainHigh);
  const mainLowIdx = mainSlice.findIndex(c => c.l === mainLow);
  const corrHighIdx = corrSlice.findIndex(c => c.h === corrHigh);
  const corrLowIdx = corrSlice.findIndex(c => c.l === corrLow);
  // Divergence: highs made at different times → hidden strength/weakness
  const highDiv = Math.abs(mainHighIdx - (inverse ? corrLowIdx : corrHighIdx)) > 3;
  const lowDiv = Math.abs(mainLowIdx - (inverse ? corrHighIdx : corrLowIdx)) > 3;
  return highDiv || lowDiv;
}

// ============================================================
// PAIR PROFILES — killzones, correlations, native sessions per instrument
// ============================================================

export type PairProfile = {
  key: string;
  killzones: { name: string; startUTC: number; endUTC: number }[];
  primeSession: { name: string; startUTC: number; endUTC: number };
  correlated?: { symbol: string; inverse: boolean }; // for SMT
};

export const PAIR_PROFILES: Record<string, PairProfile> = {
  // Metals — London + NY overlap
  XAUUSD: {
    key: "XAUUSD",
    killzones: [
      { name: "London Killzone", startUTC: 7, endUTC: 10 },
      { name: "NY AM Killzone", startUTC: 12, endUTC: 15 },
    ],
    primeSession: { name: "London/NY overlap", startUTC: 7, endUTC: 15 },
    correlated: { symbol: "DXY", inverse: true },
  },
  XAGUSD: {
    key: "XAGUSD",
    killzones: [
      { name: "London Killzone", startUTC: 7, endUTC: 10 },
      { name: "NY AM Killzone", startUTC: 12, endUTC: 15 },
    ],
    primeSession: { name: "London/NY overlap", startUTC: 7, endUTC: 15 },
    correlated: { symbol: "DXY", inverse: true },
  },
  // EUR/GBP — London prime
  EURUSD: {
    key: "EURUSD",
    killzones: [
      { name: "London Killzone", startUTC: 7, endUTC: 10 },
      { name: "NY AM Killzone", startUTC: 12, endUTC: 15 },
    ],
    primeSession: { name: "London", startUTC: 7, endUTC: 12 },
    correlated: { symbol: "GBPUSD", inverse: false },
  },
  GBPUSD: {
    key: "GBPUSD",
    killzones: [
      { name: "London Killzone", startUTC: 7, endUTC: 10 },
      { name: "NY AM Killzone", startUTC: 12, endUTC: 15 },
    ],
    primeSession: { name: "London", startUTC: 7, endUTC: 12 },
    correlated: { symbol: "EURUSD", inverse: false },
  },
  // JPY pairs — Tokyo + London
  USDJPY: {
    key: "USDJPY",
    killzones: [
      { name: "Tokyo Killzone", startUTC: 0, endUTC: 3 },
      { name: "London Killzone", startUTC: 7, endUTC: 10 },
    ],
    primeSession: { name: "Tokyo/London", startUTC: 0, endUTC: 10 },
    correlated: { symbol: "DXY", inverse: false },
  },
  EURJPY: {
    key: "EURJPY",
    killzones: [
      { name: "Tokyo Killzone", startUTC: 0, endUTC: 3 },
      { name: "London Killzone", startUTC: 7, endUTC: 10 },
    ],
    primeSession: { name: "Tokyo/London", startUTC: 0, endUTC: 10 },
    correlated: { symbol: "USDJPY", inverse: false },
  },
  GBPJPY: {
    key: "GBPJPY",
    killzones: [
      { name: "Tokyo Killzone", startUTC: 0, endUTC: 3 },
      { name: "London Killzone", startUTC: 7, endUTC: 10 },
    ],
    primeSession: { name: "Tokyo/London", startUTC: 0, endUTC: 10 },
    correlated: { symbol: "USDJPY", inverse: false },
  },
  // AUD/NZD — Sydney/Tokyo
  AUDUSD: {
    key: "AUDUSD",
    killzones: [
      { name: "Sydney Killzone", startUTC: 22, endUTC: 24 },
      { name: "Tokyo Killzone", startUTC: 0, endUTC: 3 },
    ],
    primeSession: { name: "Sydney/Tokyo", startUTC: 22, endUTC: 3 },
    correlated: { symbol: "DXY", inverse: true },
  },
  NZDUSD: {
    key: "NZDUSD",
    killzones: [
      { name: "Sydney Killzone", startUTC: 22, endUTC: 24 },
      { name: "Tokyo Killzone", startUTC: 0, endUTC: 3 },
    ],
    primeSession: { name: "Sydney/Tokyo", startUTC: 22, endUTC: 3 },
    correlated: { symbol: "DXY", inverse: true },
  },
  USDCAD: {
    key: "USDCAD",
    killzones: [{ name: "NY AM Killzone", startUTC: 12, endUTC: 15 }],
    primeSession: { name: "NY", startUTC: 12, endUTC: 17 },
    correlated: { symbol: "DXY", inverse: false },
  },
  // Indices — NY session
  NAS100: {
    key: "NAS100",
    killzones: [
      { name: "NY AM Killzone", startUTC: 13, endUTC: 16 },
      { name: "NY PM Killzone", startUTC: 18, endUTC: 20 },
    ],
    primeSession: { name: "NY RTH", startUTC: 13, endUTC: 20 },
    correlated: { symbol: "SPX500", inverse: false },
  },
  SPX500: {
    key: "SPX500",
    killzones: [
      { name: "NY AM Killzone", startUTC: 13, endUTC: 16 },
      { name: "NY PM Killzone", startUTC: 18, endUTC: 20 },
    ],
    primeSession: { name: "NY RTH", startUTC: 13, endUTC: 20 },
    correlated: { symbol: "NAS100", inverse: false },
  },
  US30: {
    key: "US30",
    killzones: [{ name: "NY AM Killzone", startUTC: 13, endUTC: 16 }],
    primeSession: { name: "NY RTH", startUTC: 13, endUTC: 20 },
    correlated: { symbol: "SPX500", inverse: false },
  },
  // Crypto — 24/7 but NY + Asian retail are prime
  BTCUSD: {
    key: "BTCUSD",
    killzones: [
      { name: "NY AM Killzone", startUTC: 13, endUTC: 16 },
      { name: "Asian Killzone", startUTC: 0, endUTC: 4 },
    ],
    primeSession: { name: "NY / Asia", startUTC: 13, endUTC: 16 },
  },
  ETHUSD: {
    key: "ETHUSD",
    killzones: [
      { name: "NY AM Killzone", startUTC: 13, endUTC: 16 },
      { name: "Asian Killzone", startUTC: 0, endUTC: 4 },
    ],
    primeSession: { name: "NY / Asia", startUTC: 13, endUTC: 16 },
    correlated: { symbol: "BTCUSD", inverse: false },
  },
};

export function getPairProfile(symbol: string): PairProfile | null {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (PAIR_PROFILES[s]) return PAIR_PROFILES[s];
  // Aliases
  if (s === "GOLD" || s === "XAU") return PAIR_PROFILES.XAUUSD;
  if (s === "SILVER" || s === "XAG") return PAIR_PROFILES.XAGUSD;
  if (s === "BTC" || s === "BITCOIN" || s === "BTCUSDT") return PAIR_PROFILES.BTCUSD;
  if (s === "ETH" || s === "ETHEREUM" || s === "ETHUSDT") return PAIR_PROFILES.ETHUSD;
  if (s === "NDX" || s === "US100" || s === "NASDAQ") return PAIR_PROFILES.NAS100;
  if (s === "SPX" || s === "US500" || s === "SP500") return PAIR_PROFILES.SPX500;
  if (s === "DJI" || s === "DOW" || s === "DOWJONES") return PAIR_PROFILES.US30;
  return null;
}

// Pair-aware killzone check. Falls back to generic global killzones if pair unknown.
export function killzoneForPair(
  symbol: string,
  d = new Date(),
): { session: string; killzone: string; inKillzone: boolean; nativeSession: boolean } {
  const h = d.getUTCHours();
  const profile = getPairProfile(symbol);
  if (profile) {
    const active = profile.killzones.find(k =>
      k.startUTC <= k.endUTC ? h >= k.startUTC && h < k.endUTC : h >= k.startUTC || h < k.endUTC,
    );
    const prime = profile.primeSession;
    const nativeSession = prime.startUTC <= prime.endUTC
      ? h >= prime.startUTC && h < prime.endUTC
      : h >= prime.startUTC || h < prime.endUTC;
    const base = killzoneOf(d);
    return {
      session: base.session,
      killzone: active ? active.name : "Outside Killzone",
      inKillzone: !!active,
      nativeSession,
    };
  }
  const base = killzoneOf(d);
  return { ...base, nativeSession: base.inKillzone };
}
