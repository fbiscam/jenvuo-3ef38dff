// Deterministic chart annotations for the interactive chart view.
// No AI, no billing — pure rule-based ICT/SMC detection on live candles.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  resolveInstrument,
  fetchInstrumentCandles,
  XAU_PAIR_LIST,
} from "@/lib/gold-analysis.functions";
import {
  analyzeTF,
  buildLiquidityPools,
  detectBreakerBlocks,
  detectIFVGs,
  killzoneOf,
  type Candle,
} from "@/lib/analysis/engine";

export type ChartCandle = { time: number; open: number; high: number; low: number; close: number };

export type ChartZone = {
  id: string;
  kind: "fvg" | "orderBlock" | "breaker" | "ifvg";
  tf: "htf" | "ltf";
  fromTime: number;
  toTime: number;
  priceLow: number;
  priceHigh: number;
  bias: "bullish" | "bearish" | "demand" | "supply";
  mitigated: boolean;
  label: string;
};

export type ChartStructure = {
  id: string;
  kind: "BOS" | "CHoCH";
  tf: "htf" | "ltf";
  fromTime: number;
  toTime: number;
  price: number;
  dir: "bullish" | "bearish";
  label: string;
};

export type ChartLiquidity = {
  id: string;
  price: number;
  side: "buy" | "sell";
  label: string;
  swept: boolean;
};

export type ChartDataResponse = {
  ok: boolean;
  error?: string;
  pair: string;
  display: string;
  decimals: number;
  timeframe: string;
  candles: ChartCandle[];
  htfBias: "bullish" | "bearish" | "ranging";
  ltfBias: "bullish" | "bearish" | "ranging";
  session: string;
  killzone: string;
  inKillzone: boolean;
  swingHigh: number;
  swingLow: number;
  equilibrium: number;
  zones: ChartZone[];
  structure: ChartStructure[];
  liquidity: ChartLiquidity[];
  lastPrice: number;
};

const VALID_TF = new Set(["5m", "15m", "1h", "4h"]);

function toChartCandles(cs: Candle[]): ChartCandle[] {
  return cs
    .map((c) => ({ time: Math.floor(c.t / 1000), open: c.o, high: c.h, low: c.l, close: c.c }))
    // dedupe timestamps (lightweight-charts requires strictly ascending & unique)
    .filter((c, i, arr) => i === 0 || c.time > arr[i - 1].time);
}

export const getChartData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { pair?: string; timeframe?: string };
    const raw = typeof obj.pair === "string" ? obj.pair.toUpperCase().trim() : "XAUUSD";
    const pair = XAU_PAIR_LIST.includes(raw) ? raw : "XAUUSD";
    const tf = typeof obj.timeframe === "string" && VALID_TF.has(obj.timeframe.toLowerCase())
      ? obj.timeframe.toLowerCase()
      : "15m";
    return { pair, timeframe: tf };
  })
  .handler(async ({ data }): Promise<ChartDataResponse> => {
    const inst = resolveInstrument(data.pair);

    // HTF = 1H, LTF = user-selected. We render LTF as the main chart and
    // overlay markings from both timeframes.
    const htfTf = "1h";
    const ltfTf = data.timeframe;

    try {
      const [htfRaw, ltfRaw] = await Promise.all([
        fetchInstrumentCandles(inst, htfTf),
        fetchInstrumentCandles(inst, ltfTf),
      ]);

      const htfA = analyzeTF(htfRaw);
      const ltfA = analyzeTF(ltfRaw);

      const lastPrice = ltfRaw.length ? ltfRaw[ltfRaw.length - 1].c : 0;

      // Build zones (FVG + OB) from both timeframes. Filter unmitigated + a
      // small window of recent mitigated for context.
      const zones: ChartZone[] = [];
      const pushFvgs = (tf: "htf" | "ltf", arr: typeof htfA.fvgs) => {
        arr.slice(-8).forEach((f, i) => {
          zones.push({
            id: `fvg-${tf}-${i}-${f.fromTime}`,
            kind: "fvg",
            tf,
            fromTime: Math.floor(f.fromTime / 1000),
            toTime: Math.floor(f.toTime / 1000),
            priceLow: f.priceLow,
            priceHigh: f.priceHigh,
            bias: f.kind,
            mitigated: f.mitigated,
            label: `${tf.toUpperCase()} ${f.kind === "bullish" ? "Bullish" : "Bearish"} FVG`,
          });
        });
      };
      const pushObs = (tf: "htf" | "ltf", arr: typeof htfA.obs) => {
        arr.slice(-6).forEach((o, i) => {
          zones.push({
            id: `ob-${tf}-${i}-${o.fromTime}`,
            kind: "orderBlock",
            tf,
            fromTime: Math.floor(o.fromTime / 1000),
            toTime: Math.floor(o.toTime / 1000),
            priceLow: o.priceLow,
            priceHigh: o.priceHigh,
            bias: o.kind,
            mitigated: o.mitigated,
            label: `${tf.toUpperCase()} ${o.kind === "demand" ? "Demand" : "Supply"} OB`,
          });
        });
      };

      pushFvgs("htf", htfA.fvgs);
      pushFvgs("ltf", ltfA.fvgs);
      pushObs("htf", htfA.obs);
      pushObs("ltf", ltfA.obs);

      // Breaker blocks + IFVGs on LTF for richer context
      try {
        const htfStruct = analyzeTF(htfRaw).lastStructure ? [analyzeTF(htfRaw).lastStructure!] : [];
        const breakers = detectBreakerBlocks(ltfRaw, htfStruct);
        breakers.slice(-4).forEach((b, i) => {
          zones.push({
            id: `brk-ltf-${i}-${b.fromTime}`,
            kind: "breaker",
            tf: "ltf",
            fromTime: Math.floor(b.fromTime / 1000),
            toTime: Math.floor(b.toTime / 1000),
            priceLow: b.priceLow,
            priceHigh: b.priceHigh,
            bias: b.kind,
            mitigated: false,
            label: `LTF ${b.kind === "bullish" ? "Bullish" : "Bearish"} Breaker`,
          });
        });

        const ifvgs = detectIFVGs(ltfRaw, ltfA.fvgs);
        ifvgs.slice(-4).forEach((f, i) => {
          zones.push({
            id: `ifvg-ltf-${i}-${f.fromTime}`,
            kind: "ifvg",
            tf: "ltf",
            fromTime: Math.floor(f.fromTime / 1000),
            toTime: Math.floor(f.toTime / 1000),
            priceLow: f.priceLow,
            priceHigh: f.priceHigh,
            bias: f.kind,
            mitigated: f.mitigated,
            label: `LTF ${f.kind === "bullish" ? "Bullish" : "Bearish"} IFVG`,
          });
        });
      } catch {
        // best-effort enrichment
      }

      // Structure events: recent BOS / CHoCH on both TFs
      const structure: ChartStructure[] = [];
      if (htfA.lastStructure) {
        const s = htfA.lastStructure;
        structure.push({
          id: `struct-htf-last`,
          kind: s.kind,
          tf: "htf",
          fromTime: Math.floor(s.fromTime / 1000),
          toTime: Math.floor(s.toTime / 1000),
          price: s.price,
          dir: s.dir,
          label: `HTF ${s.kind} ${s.dir === "bullish" ? "↑" : "↓"}`,
        });
      }
      if (ltfA.lastStructure) {
        const s = ltfA.lastStructure;
        structure.push({
          id: `struct-ltf-last`,
          kind: s.kind,
          tf: "ltf",
          fromTime: Math.floor(s.fromTime / 1000),
          toTime: Math.floor(s.toTime / 1000),
          price: s.price,
          dir: s.dir,
          label: `LTF ${s.kind} ${s.dir === "bullish" ? "↑" : "↓"}`,
        });
      }

      // Liquidity pools (equal highs/lows + PDH/PDL etc.)
      const pools = buildLiquidityPools(htfRaw, ltfRaw);
      const liquidity: ChartLiquidity[] = pools.slice(0, 8).map((p, i) => ({
        id: `liq-${i}`,
        price: p.price,
        side: p.side,
        label: p.label,
        swept: p.swept,
      }));

      const kz = killzoneOf(new Date());

      return {
        ok: true,
        pair: inst.symbol,
        display: inst.display,
        decimals: inst.decimals,
        timeframe: ltfTf,
        candles: toChartCandles(ltfRaw),
        htfBias: htfA.trend,
        ltfBias: ltfA.trend,
        session: kz.session,
        killzone: kz.killzone,
        inKillzone: kz.inKillzone,
        swingHigh: htfA.swingHigh,
        swingLow: htfA.swingLow,
        equilibrium: htfA.equilibrium,
        zones,
        structure,
        liquidity,
        lastPrice,
      };
    } catch (e) {
      const msg = (e as Error)?.message || "Chart data unavailable";
      return {
        ok: false,
        error: msg,
        pair: inst.symbol,
        display: inst.display,
        decimals: inst.decimals,
        timeframe: ltfTf,
        candles: [],
        htfBias: "ranging",
        ltfBias: "ranging",
        session: "",
        killzone: "",
        inKillzone: false,
        swingHigh: 0,
        swingLow: 0,
        equilibrium: 0,
        zones: [],
        structure: [],
        liquidity: [],
        lastPrice: 0,
      };
    }
  });
