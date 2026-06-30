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

  // HTF swing extremes
  const sh = Math.max(...htf.slice(-80).map(c => c.h));
  const sl = Math.min(...htf.slice(-80).map(c => c.l));
  out.push({ price: sh, side: "buy", label: "HTF Swing High", swept: false });
  out.push({ price: sl, side: "sell", label: "HTF Swing Low", swept: false });

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
  entry: number; sl: number; tp: number; rr: number;
  zone: { kind: "OB" | "FVG"; priceLow: number; priceHigh: number } | null;
  reason: string;
};

export function buildTrade(
  htf: TFAnalysis,
  ltf: TFAnalysis,
  pools: LiquidityPool[],
  lastPrice: number,
): BuiltTrade {
  // Direction from HTF + LTF agreement
  const dir: "BUY" | "SELL" | "WAIT" =
    htf.trend === "bullish" && (ltf.trend === "bullish" || ltf.trend === "ranging") ? "BUY" :
    htf.trend === "bearish" && (ltf.trend === "bearish" || ltf.trend === "ranging") ? "SELL" : "WAIT";

  if (dir === "WAIT") {
    return { direction: "WAIT", entry: 0, sl: 0, tp: 0, rr: 0, zone: null, reason: "HTF/LTF disagree — no clean trend." };
  }

  // Pick best zone: unmitigated LTF FVG/OB on the trade side, closest to price, on correct side
  const candidates: Array<{ kind: "OB" | "FVG"; priceLow: number; priceHigh: number; dist: number }> = [];
  for (const f of ltf.fvgs) {
    const ok = dir === "BUY" ? f.kind === "bullish" && f.priceHigh <= lastPrice : f.kind === "bearish" && f.priceLow >= lastPrice;
    if (ok) candidates.push({ kind: "FVG", priceLow: f.priceLow, priceHigh: f.priceHigh, dist: Math.abs(lastPrice - (f.priceLow + f.priceHigh) / 2) });
  }
  for (const o of ltf.obs) {
    const ok = dir === "BUY" ? o.kind === "demand" && o.priceHigh <= lastPrice : o.kind === "supply" && o.priceLow >= lastPrice;
    if (ok) candidates.push({ kind: "OB", priceLow: o.priceLow, priceHigh: o.priceHigh, dist: Math.abs(lastPrice - (o.priceLow + o.priceHigh) / 2) });
  }
  candidates.sort((a, b) => a.dist - b.dist);
  const zone = candidates[0] ?? null;

  if (!zone) {
    return { direction: "WAIT", entry: 0, sl: 0, tp: 0, rr: 0, zone: null, reason: "No unmitigated OB/FVG aligned with bias." };
  }

  // Entry = zone midpoint
  const entry = (zone.priceLow + zone.priceHigh) / 2;
  // SL = 0.1% buffer beyond zone extreme on the opposing side
  const buffer = lastPrice * 0.0008;
  const sl = dir === "BUY" ? zone.priceLow - buffer : zone.priceHigh + buffer;
  // TP = nearest unswept opposing liquidity pool
  const targetSide: "buy" | "sell" = dir === "BUY" ? "buy" : "sell";
  const targets = pools
    .filter(p => p.side === targetSide && !p.swept && (dir === "BUY" ? p.price > entry : p.price < entry))
    .sort((a, b) => Math.abs(a.price - entry) - Math.abs(b.price - entry));
  let tp = targets[0]?.price ?? (dir === "BUY" ? entry + (entry - sl) * 3 : entry - (sl - entry) * 3);
  let risk = Math.abs(entry - sl);
  let reward = Math.abs(tp - entry);
  // Enforce minimum 1:2; if liquidity target too close, extend to 1:3
  if (risk > 0 && reward / risk < 2) {
    tp = dir === "BUY" ? entry + risk * 3 : entry - risk * 3;
    reward = Math.abs(tp - entry);
  }
  const rr = risk > 0 ? reward / risk : 0;

  return {
    direction: dir, entry, sl, tp, rr, zone: { kind: zone.kind, priceLow: zone.priceLow, priceHigh: zone.priceHigh },
    reason: `${dir} from ${zone.kind} @ ${entry.toFixed(2)}, SL beyond zone, TP at ${targets[0]?.label ?? "1:3 R extension"}.`,
  };
}

// ---------- Score (7-factor weighted) ----------

export type ScoreFactor = { key: string; label: string; weight: number; pass: boolean; detail: string };

export function scoreSetup(args: {
  trade: BuiltTrade;
  htf: TFAnalysis;
  ltf: TFAnalysis;
  pools: LiquidityPool[];
  inKillzone: boolean;
  imminentHighNews: boolean;
  dxyConfirms: boolean | null;     // null = unknown / N/A
  lastPrice: number;
}): { score: number; grade: "A+" | "A" | "B" | "C"; factors: ScoreFactor[] } {
  const { trade, htf, ltf, pools, inKillzone, imminentHighNews, dxyConfirms, lastPrice } = args;
  const f: ScoreFactor[] = [];
  const dir = trade.direction;

  f.push({
    key: "bias", label: "HTF + LTF bias aligned", weight: 25,
    pass: dir !== "WAIT" && htf.trend === (dir === "BUY" ? "bullish" : "bearish"),
    detail: `HTF: ${htf.trend} · LTF: ${ltf.trend}`,
  });

  const sweptPool = pools.find(p => p.swept && (dir === "BUY" ? p.side === "sell" : p.side === "buy"));
  f.push({
    key: "sweep", label: "Liquidity sweep before entry", weight: 20,
    pass: !!sweptPool,
    detail: sweptPool ? `${sweptPool.label} swept @ ${sweptPool.price.toFixed(2)}` : "No recent sweep detected",
  });

  f.push({
    key: "zone", label: "Unmitigated OB/FVG at entry", weight: 15,
    pass: !!trade.zone,
    detail: trade.zone ? `${trade.zone.kind} ${trade.zone.priceLow.toFixed(2)}–${trade.zone.priceHigh.toFixed(2)}` : "No clean zone",
  });

  const inPremium = lastPrice > htf.equilibrium;
  const pdOk = dir === "BUY" ? !inPremium : dir === "SELL" ? inPremium : false;
  f.push({
    key: "pd", label: "Premium/Discount correct side", weight: 10,
    pass: pdOk,
    detail: `Price is in ${inPremium ? "premium" : "discount"}, trade is ${dir}`,
  });

  f.push({
    key: "killzone", label: "Inside active killzone", weight: 10,
    pass: inKillzone,
    detail: inKillzone ? "Killzone active" : "Outside killzone",
  });

  f.push({
    key: "dxy", label: "DXY correlation confirms", weight: 10,
    pass: dxyConfirms === true,
    detail: dxyConfirms == null ? "DXY data unavailable" : dxyConfirms ? "DXY moving inverse" : "DXY not confirming",
  });

  f.push({
    key: "rr", label: "Clean R:R ≥ 1:3", weight: 10,
    pass: trade.rr >= 3,
    detail: `R:R 1:${trade.rr.toFixed(2)}`,
  });

  // News kill-switch: high-impact within 30m → cap grade
  const totalWeight = f.reduce((s, x) => s + x.weight, 0);
  const earned = f.reduce((s, x) => s + (x.pass ? x.weight : 0), 0);
  let score = Math.round((earned / totalWeight) * 100);
  if (imminentHighNews) score = Math.min(score, 60);

  const grade: "A+" | "A" | "B" | "C" =
    score >= 85 ? "A+" : score >= 70 ? "A" : score >= 55 ? "B" : "C";

  return { score, grade, factors: f };
}
