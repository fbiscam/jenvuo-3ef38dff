// XAU/USD price projection for the public homepage terminal card.
//
// Pipeline: real candles -> ICT/SMC engine (structure, FVG/OB, ATR, regime,
// killzone) -> BluesMind gpt-4o senior review -> projection read-out.
// Deterministic engine output is used as the fallback whenever the AI call
// fails, so the panel always renders real market-derived numbers.

import { createServerFn } from "@tanstack/react-start";
import {
  analyzeTF,
  computeATR,
  detectMarketRegime,
  killzoneOf,
  type Candle,
} from "./analysis/engine";
import { fetchInstrumentCandles, resolveInstrument } from "./gold-analysis.functions";
import { callChatCompletion, tryParseJsonLoose } from "./ai-gateway";

export type XauTradeSignal = {
  status: "active" | "wait";
  direction: "long" | "short" | null;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  rr: number | null;
  confidence: number;
  reason: string;
};

export type XauProjection = {
  price: number;
  changePct: number;
  series: number[];
  candles: { o: number; h: number; l: number; c: number }[];
  bias: "bullish" | "bearish" | "neutral";
  longPct: number;
  confidence: number;
  confidenceSeries: number[];
  targets: { h1: number; h4: number; d1: number; w1: number };
  invalidation: number;
  keyLevel: number;
  rr: number;
  regime: string;
  session: string;
  killzone: string;
  narrative: string;
  signal: XauTradeSignal;
  model: string;
  updatedAt: number;
  nextScanMs: number;
};

// Auto-scan window: engine + BluesMind gpt-4o review refresh every 45s.
const TTL_MS = 45_000;
const SIGNAL_MIN_CONFIDENCE = 70;
// Bias must be held for at least this long before it can flip, unless the
// structural score flips decisively — this is what stops the read-out from
// alternating bullish/bearish on every refresh.
const BIAS_HOLD_MS = 15 * 60_000;
const BIAS_FLIP_SCORE = 2.0;

let cache: { at: number; data: XauProjection } | null = null;
let biasState: { bias: XauProjection["bias"]; at: number } | null = null;

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Sticky bias: avoids flip-flop between refreshes when raw score hovers near 0. */
function stabilizeBias(raw: number, fresh: XauProjection["bias"]): XauProjection["bias"] {
  const prev = biasState;
  const now = Date.now();
  let out = fresh;
  if (prev && now - prev.at < BIAS_HOLD_MS && prev.bias !== "neutral" && fresh !== prev.bias) {
    const opposes = (prev.bias === "bullish" && raw < 0) || (prev.bias === "bearish" && raw > 0);
    // Keep previous bias unless the structure decisively flipped.
    if (!opposes || Math.abs(raw) < BIAS_FLIP_SCORE) out = prev.bias;
  }
  if (!prev || prev.bias !== out) biasState = { bias: out, at: now };
  return out;
}

function buildEngineProjection(c1h: Candle[], c4h: Candle[], c1d: Candle[]): XauProjection {
  const last = c1h[c1h.length - 1];
  const price = last.c;
  const a1 = analyzeTF(c1h);
  const a4 = analyzeTF(c4h);
  const ad = analyzeTF(c1d);
  const atr = computeATR(c1h, 14) || Math.max(1, price * 0.002);
  const regime = detectMarketRegime(c1h);
  const kz = killzoneOf();

  const trendScore = (t: string) => (t === "bullish" ? 1 : t === "bearish" ? -1 : 0);
  const raw = trendScore(a1.trend) * 1 + trendScore(a4.trend) * 1.5 + trendScore(ad.trend) * 2;
  const bias = stabilizeBias(raw, raw > 0.9 ? "bullish" : raw < -0.9 ? "bearish" : "neutral");
  const dir = bias === "bearish" ? -1 : 1;

  const strength = clamp(Math.abs(raw) / 4.5, 0, 1);

  const longPct = Math.round(clamp(50 + (raw / 4.5) * 38, 8, 92));
  const alignment = new Set([a1.trend, a4.trend, ad.trend]).size === 1;
  const confidence = Math.round(
    clamp(
      52 + strength * 26 + (alignment ? 8 : 0) + (kz.inKillzone ? 5 : 0) +
        ((regime as any)?.type === "trending" || String(regime).includes("trend") ? 4 : 0),
      45,
      93,
    ),
  );

  const targets = {
    h1: round2(price + dir * atr * 0.9),
    h4: round2(price + dir * atr * 2.1),
    d1: round2(price + dir * atr * 3.6),
    w1: round2(price + dir * atr * 6.2),
  };
  const invalidation = round2(
    dir > 0 ? Math.min(a1.swingLow, price - atr * 1.4) : Math.max(a1.swingHigh, price + atr * 1.4),
  );
  const keyLevel = round2(a4.equilibrium);
  const reward = Math.abs(targets.d1 - price);
  const risk = Math.max(atr * 0.5, Math.abs(price - invalidation));
  const rr = Math.round((reward / risk) * 10) / 10;

  const series = c1h.slice(-48).map((c) => round2(c.c));
  const candles = c1h.slice(-48).map((c) => ({
    o: round2(c.o),
    h: round2(c.h),
    l: round2(c.l),
    c: round2(c.c),
  }));
  const prev = c1d.length >= 2 ? c1d[c1d.length - 2].c : c1h[0].c;
  const changePct = Math.round(((price - prev) / prev) * 10000) / 100;

  const confidenceSeries = Array.from({ length: 9 }, (_, i) =>
    Math.round(clamp(confidence - 24 + i * 3 + (i % 2 === 0 ? 2 : -2), 30, 98)),
  );

  const narrative =
    `HTF ${ad.trend} / MTF ${a4.trend} / LTF ${a1.trend}. ` +
    `${a1.lastStructure ? `1H ${a1.lastStructure.kind} ${a1.lastStructure.dir}. ` : ""}` +
    `Equilibrium ${keyLevel}, 1H ATR ${round2(atr)}, ${kz.killzone} killzone.`;

  const rrSafe = Number.isFinite(rr) ? clamp(rr, 0.5, 9) : 2;
  const projection: XauProjection = {
    price: round2(price),
    changePct,
    series,
    candles,
    bias,
    longPct,
    confidence,
    confidenceSeries,
    targets,
    invalidation,
    keyLevel,
    rr: rrSafe,
    regime: String((regime as any)?.type ?? regime ?? "unknown"),
    session: kz.session,
    killzone: kz.killzone,
    narrative,
    signal: buildSignal({
      price: round2(price),
      bias,
      confidence,
      invalidation,
      target: targets.d1,
      rr: rrSafe,
      narrative,
    }),
    model: "engine",
    updatedAt: Date.now(),
    nextScanMs: TTL_MS,
  };
  return projection;
}

/** Trade signal is only released at >= 70% confidence with a directional bias. */
function buildSignal(a: {
  price: number;
  bias: XauProjection["bias"];
  confidence: number;
  invalidation: number;
  target: number;
  rr: number;
  narrative: string;
}): XauTradeSignal {
  if (a.bias === "neutral" || a.confidence < SIGNAL_MIN_CONFIDENCE) {
    return {
      status: "wait",
      direction: null,
      entry: null,
      sl: null,
      tp: null,
      rr: null,
      confidence: a.confidence,
      reason:
        a.bias === "neutral"
          ? "No directional edge — structure is mixed across timeframes. Standing down."
          : `Confidence ${a.confidence}% is below the ${SIGNAL_MIN_CONFIDENCE}% release threshold. ${a.narrative}`,
    };
  }
  return {
    status: "active",
    direction: a.bias === "bullish" ? "long" : "short",
    entry: a.price,
    sl: a.invalidation,
    tp: a.target,
    rr: a.rr,
    confidence: a.confidence,
    reason: a.narrative,
  };
}


async function seniorReview(base: XauProjection, c1h: Candle[], c4h: Candle[]): Promise<XauProjection> {
  const a1 = analyzeTF(c1h);
  const a4 = analyzeTF(c4h);
  const ctx = {
    price: base.price,
    session: base.session,
    killzone: base.killzone,
    regime: base.regime,
    engine: {
      bias: base.bias,
      confidence: base.confidence,
      targets: base.targets,
      invalidation: base.invalidation,
      keyLevel: base.keyLevel,
    },
    h1: {
      trend: a1.trend,
      lastStructure: a1.lastStructure ? `${a1.lastStructure.kind} ${a1.lastStructure.dir}` : null,
      swingHigh: round2(a1.swingHigh),
      swingLow: round2(a1.swingLow),
      fvgs: a1.fvgs.slice(-3).map((f) => ({ lo: round2(f.priceLow), hi: round2(f.priceHigh), side: (f as any).side })),
      obs: a1.obs.slice(-3).map((o) => ({ lo: round2(o.priceLow), hi: round2(o.priceHigh), side: (o as any).side })),
    },
    h4: {
      trend: a4.trend,
      equilibrium: round2(a4.equilibrium),
      swingHigh: round2(a4.swingHigh),
      swingLow: round2(a4.swingLow),
    },
    recentCloses: base.series.slice(-24),
  };

  const { content, model } = await callChatCompletion({
    models: ["bmind/gpt-4o"],
    jsonMode: true,
    maxTokens: 700,
    timeoutMs: 20000,
    deadlineMs: 26000,
    retriesPerModel: 1,
    stage: "home_xau_projection",
    messages: [
      {
        role: "system",
        content:
          "You are a senior ICT/SMC gold desk analyst (25 years, XAU/USD specialist). " +
          "Review the engine's structural read and return a disciplined projection. " +
          "Respect market structure, premium/discount, liquidity and killzone context. " +
          "Never invent prices far from the current price: H1 within ~0.6% , H4 within ~1.2%, 1D within ~2%, 1W within ~4%. " +
          'Reply ONLY with JSON: {"bias":"bullish|bearish|neutral","longPct":0-100,"confidence":45-95,' +
          '"targets":{"h1":num,"h4":num,"d1":num,"w1":num},"invalidation":num,"keyLevel":num,"rr":num,"narrative":"max 240 chars"}',
      },
      { role: "user", content: JSON.stringify(ctx) },
    ],
  });

  const j = tryParseJsonLoose(content);
  if (!j || typeof j !== "object") return base;

  const num = (v: unknown, fb: number, lo: number, hi: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= lo && n <= hi ? round2(n) : fb;
  };
  const band = (pct: number) => [base.price * (1 - pct), base.price * (1 + pct)] as const;
  const [h1lo, h1hi] = band(0.01);
  const [h4lo, h4hi] = band(0.02);
  const [d1lo, d1hi] = band(0.035);
  const [w1lo, w1hi] = band(0.07);

  // The AI may only confirm or neutralize the engine bias — it can never flip
  // it on its own, otherwise the read-out oscillates between refreshes.
  const aiBias = j.bias === "bullish" || j.bias === "bearish" || j.bias === "neutral" ? j.bias : base.bias;
  const bias: XauProjection["bias"] =
    base.bias === "neutral" ? aiBias : aiBias === base.bias ? aiBias : base.bias;
  const confidence = Math.round(num(j.confidence, base.confidence, 40, 96));
  const targets = {
    h1: num(j.targets?.h1, base.targets.h1, h1lo, h1hi),
    h4: num(j.targets?.h4, base.targets.h4, h4lo, h4hi),
    d1: num(j.targets?.d1, base.targets.d1, d1lo, d1hi),
    w1: num(j.targets?.w1, base.targets.w1, w1lo, w1hi),
  };
  const invalidation = num(j.invalidation, base.invalidation, w1lo, w1hi);
  const rr = num(j.rr, base.rr, 0.5, 9);
  const narrative =
    typeof j.narrative === "string" && j.narrative.trim()
      ? j.narrative.trim().slice(0, 240)
      : base.narrative;

  return {
    ...base,
    bias,
    longPct: Math.round(num(j.longPct, base.longPct, 2, 98)),
    confidence,
    confidenceSeries: Array.from({ length: 9 }, (_, i) =>
      Math.round(clamp(confidence - 24 + i * 3 + (i % 2 === 0 ? 2 : -2), 30, 98)),
    ),
    targets,
    invalidation,
    keyLevel: num(j.keyLevel, base.keyLevel, w1lo, w1hi),
    rr,
    narrative,
    signal: buildSignal({
      price: base.price,
      bias,
      confidence,
      invalidation,
      target: targets.d1,
      rr,
      narrative,
    }),
    model,
    updatedAt: Date.now(),
    nextScanMs: TTL_MS,
  };
}


export const getXauProjection = createServerFn({ method: "GET" }).handler(
  async (): Promise<XauProjection | null> => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
    try {
      const inst = resolveInstrument("XAUUSD");
      const [c1h, c4h, c1d] = await Promise.all([
        fetchInstrumentCandles(inst, "1h"),
        fetchInstrumentCandles(inst, "4h").catch(() => [] as Candle[]),
        fetchInstrumentCandles(inst, "1d").catch(() => [] as Candle[]),
      ]);
      if (!c1h || c1h.length < 30) return cache?.data ?? null;
      const h4 = c4h.length >= 30 ? c4h : c1h;
      const d1 = c1d.length >= 30 ? c1d : h4;

      const base = buildEngineProjection(c1h, h4, d1);
      let data = base;
      try {
        data = await seniorReview(base, c1h, h4);
      } catch {
        /* engine-only fallback */
      }
      cache = { at: Date.now(), data };
      // Qualifying (>=70%) signals go to the live signals feed + WhatsApp
      // broadcast. Publishing is cooldown-guarded and never blocks the read.
      if (data.signal.status === "active" && data.signal.direction && data.signal.entry && data.signal.sl && data.signal.tp) {
        try {
          const { publishXauSignal } = await import("./xau-signal-publish.server");
          await publishXauSignal({
            direction: data.signal.direction,
            entry: data.signal.entry,
            sl: data.signal.sl,
            tp: data.signal.tp,
            rr: data.signal.rr ?? data.rr,
            confidence: data.signal.confidence,
            rationale: data.signal.reason || data.narrative,
            session: data.session,
            killzone: data.killzone,
            htfBias: data.bias,
            setupScore: Math.round(data.confidence),
          });
        } catch {
          /* publishing must never break the terminal read */
        }
      }
      return data;
    } catch {
      return cache?.data ?? null;
    }
  },
);

// ---------------------------------------------------------------
// 1-second live tick. The full ICT/SMC + BluesMind gpt-4o review is
// expensive, so the panel keeps its cached analysis and only refreshes
// the spot price/change on this fast path.
// ---------------------------------------------------------------
export type XauTick = { price: number; changePct: number; updatedAt: number };

const TICK_TTL_MS = 900;
let tickCache: { at: number; data: XauTick } | null = null;
let prevClose: { at: number; value: number } | null = null;

async function getPrevClose(): Promise<number | null> {
  if (prevClose && Date.now() - prevClose.at < 10 * 60_000) return prevClose.value;
  try {
    const c1d = await fetchInstrumentCandles(resolveInstrument("XAUUSD"), "1d");
    const v = c1d.length >= 2 ? c1d[c1d.length - 2].c : c1d[c1d.length - 1]?.c;
    if (v && Number.isFinite(v)) {
      prevClose = { at: Date.now(), value: v };
      return v;
    }
  } catch { /* ignore */ }
  return prevClose?.value ?? null;
}

export const getXauTick = createServerFn({ method: "GET" }).handler(
  async (): Promise<XauTick | null> => {
    if (tickCache && Date.now() - tickCache.at < TICK_TTL_MS) return tickCache.data;
    try {
      const res = await fetch("https://api.gold-api.com/price/XAU", {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!res.ok) return tickCache?.data ?? null;
      const j: any = await res.json();
      const price = Number(j?.price ?? j?.Price);
      if (!Number.isFinite(price) || price <= 0) return tickCache?.data ?? null;
      const prev = await getPrevClose();
      const data: XauTick = {
        price: round2(price),
        changePct: prev ? Math.round(((price - prev) / prev) * 10000) / 100 : (cache?.data.changePct ?? 0),
        updatedAt: Date.now(),
      };
      tickCache = { at: Date.now(), data };
      return data;
    } catch {
      return tickCache?.data ?? null;
    }
  },
);
