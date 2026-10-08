import { atr, ema, type OhlcvBar } from "./indicators";

/**
 * Candle range: for one candle, an expected high / low from its open plus a
 * TP / SL scenario, built only from the candles BEFORE it (no look-ahead), so
 * a past candle's plan never changes after it closes. Statistical scenario,
 * not a guarantee and not the Zone + FVG strategy plan.
 */
export type CandleRangeBias = "bullish" | "bearish" | "neutral";
export type CandleRangeOutcome = "live" | "tp" | "sl" | "both" | "none";

export type CandleRangePlan = {
  index: number;
  time: number;
  open: number;
  bias: CandleRangeBias;
  /** Directional agreement 50–70; a scenario, never a certainty. */
  confidence: number;
  expHigh: number;
  expLow: number;
  /** Null when bias is neutral (range only, no trade). */
  tp: number | null;
  sl: number | null;
  outcome: CandleRangeOutcome;
};

export type CandleRangeReport = {
  plans: CandleRangePlan[];
  /** Over the last up-to-100 closed candles with a directional plan. */
  track: { samples: number; tpFirstPct: number; slPct: number } | null;
};

export const CANDLE_RANGE_WINDOW = 50;
export const CANDLE_RANGE_SHOWN = 6; // current candle + previous 5
const TRACK_SAMPLES = 100;

function quantile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  if (!s.length) return 0;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

const sign = (v: number, eps: number) => (v > eps ? 1 : v < -eps ? -1 : 0);

function planAt(bars: OhlcvBar[], i: number, atrArr: number[], emaArr: number[], live: boolean): CandleRangePlan | null {
  if (i < CANDLE_RANGE_WINDOW + 5 || i >= bars.length) return null;
  const a = atrArr[i - 1];
  if (!Number.isFinite(a) || a <= 0) return null;
  const open = bars[i].open;
  const up: number[] = [];
  const dn: number[] = [];
  for (let k = i - CANDLE_RANGE_WINDOW; k < i; k++) {
    up.push(Math.max(0, bars[k].high - bars[k].open));
    dn.push(Math.max(0, bars[k].open - bars[k].low));
  }
  const prev = bars[i - 1];
  const eps = a * 0.05;
  const slope = emaArr[i - 1] - emaArr[i - 6];
  const momentum = prev.close - bars[i - 4].close;
  const prevRange = Math.max(prev.high - prev.low, Number.EPSILON);
  const closeLoc = (prev.close - prev.low) / prevRange; // 0 = at low, 1 = at high
  const trendSide = prev.close - emaArr[i - 1];
  const votes = [
    sign(slope, eps),
    sign(momentum, eps * 2),
    closeLoc >= 0.7 ? 1 : closeLoc <= 0.3 ? -1 : 0,
    sign(trendSide, eps),
  ];
  const score = votes.reduce((s, v) => s + v, 0);
  const bias: CandleRangeBias = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";
  const agree = votes.filter((v) => v !== 0 && Math.sign(v) === Math.sign(score)).length;
  const confidence = bias === "neutral" ? 50 : Math.min(70, 50 + agree * 5);

  const upTypical = quantile(up, 0.65);
  const dnTypical = quantile(dn, 0.65);
  const kUp = bias === "bullish" ? 1.15 : bias === "bearish" ? 0.85 : 1;
  const kDn = bias === "bearish" ? 1.15 : bias === "bullish" ? 0.85 : 1;
  const expHigh = open + upTypical * kUp;
  const expLow = open - dnTypical * kDn;
  let tp: number | null = null;
  let sl: number | null = null;
  if (bias === "bullish") {
    tp = expHigh;
    sl = open - (quantile(dn, 0.8) + a * 0.1);
  } else if (bias === "bearish") {
    tp = expLow;
    sl = open + (quantile(up, 0.8) + a * 0.1);
  }
  const bar = bars[i];
  let outcome: CandleRangeOutcome = "none";
  if (tp != null && sl != null) {
    const tpHit = bias === "bullish" ? bar.high >= tp : bar.low <= tp;
    const slHit = bias === "bullish" ? bar.low <= sl : bar.high >= sl;
    outcome = tpHit && slHit ? "both" : tpHit ? "tp" : slHit ? "sl" : live ? "live" : "none";
  } else if (live) outcome = "live";
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    index: i,
    time: bar.time,
    open: r(open),
    bias,
    confidence,
    expHigh: r(expHigh),
    expLow: r(expLow),
    tp: tp == null ? null : r(tp),
    sl: sl == null ? null : r(sl),
    outcome,
  };
}

/**
 * Plans for the forming candle and the previous 5 closed candles, plus a
 * track record of how often the TP was touched without the SL on the last
 * 100 closed candles. `lastIsLive` marks the final bar as still forming.
 */
export function computeCandleRanges(bars: OhlcvBar[], lastIsLive = true): CandleRangeReport {
  const n = bars.length;
  if (n < CANDLE_RANGE_WINDOW + 6) return { plans: [], track: null };
  const atrArr = atr(bars, 14);
  const emaArr = ema(bars.map((b) => b.close), 20);
  const plans: CandleRangePlan[] = [];
  for (let i = Math.max(0, n - CANDLE_RANGE_SHOWN); i < n; i++) {
    const p = planAt(bars, i, atrArr, emaArr, lastIsLive && i === n - 1);
    if (p) plans.push(p);
  }
  let samples = 0;
  let tpOnly = 0;
  let slAny = 0;
  const lastClosed = lastIsLive ? n - 2 : n - 1;
  for (let i = lastClosed; i >= 0 && i > lastClosed - TRACK_SAMPLES; i--) {
    const p = planAt(bars, i, atrArr, emaArr, false);
    if (!p || p.tp == null) continue;
    samples++;
    if (p.outcome === "tp") tpOnly++;
    else if (p.outcome === "sl" || p.outcome === "both") slAny++;
  }
  const track = samples >= 10
    ? { samples, tpFirstPct: Math.round((tpOnly / samples) * 100), slPct: Math.round((slAny / samples) * 100) }
    : null;
  return { plans, track };
}
