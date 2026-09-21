/**
 * Extreme M30 Gold Reversal Engine ("Three Stocks" Funded Edition).
 *
 * Deterministic, closed-candle only. The engine validates the Mother /
 * Inside-Bar reversal pattern on M30 against:
 *  - Phase 1: location (H4 + H1 major swing S/R sweep) and session filter
 *  - Phase 2: pattern anatomy (ATR volatility filter + volume compression)
 *  - Phase 3: breakout triggers with a spread buffer
 *  - Phase 4: 1:3 RR with clean-traffic swing validation
 *  - Phase 5: 2-trades-per-day lock and break-even at 1:1.5 RR
 *
 * Nothing here forecasts an outcome. Every number is measured from candles
 * that already closed so the AI can quote levels instead of inventing them.
 */

import { classifyNewYorkSession, type TradingSession } from "./execution-evidence";

export type ReversalCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

export type ReversalStatus =
  | "ARMED_BUY_STOP"
  | "ARMED_SELL_STOP"
  | "NO_PATTERN"
  | "REJECTED_LOCATION"
  | "REJECTED_SESSION"
  | "REJECTED_VOLATILITY"
  | "REJECTED_VOLUME"
  | "REJECTED_RR_TRAFFIC"
  | "ENGINE_LOCKED_DAILY_LIMIT";

export type MajorLevel = {
  timeframe: "H4" | "H1";
  kind: "HIGH" | "LOW";
  price: number;
  t: number;
};

export type ThreeStocksPattern = {
  mother_t: number;
  inside_t: number;
  mother_high: number;
  mother_low: number;
  mother_range: number;
  inside_high: number;
  inside_low: number;
  mother_volume: number | null;
  inside_volume: number | null;
  direction_bias: "BULLISH_REVERSAL" | "BEARISH_REVERSAL" | "UNRESOLVED";
};

export type ThreeStocksPlan = {
  direction: "BUY" | "SELL";
  entry: number;
  stop_loss: number;
  risk: number;
  target_1_3: number;
  break_even_trigger: number;
  nearest_opposing_swing: number | null;
  clean_traffic: boolean;
};

export type ThreeStocksEvidence = {
  module: "EXTREME_M30_GOLD_REVERSAL";
  status: ReversalStatus;
  timeframe: "M30";
  session: TradingSession;
  session_allowed: boolean;
  atr_14: number;
  daily_trades_taken: number;
  engine_locked: boolean;
  swept_level: MajorLevel | null;
  major_levels: MajorLevel[];
  pattern: ThreeStocksPattern | null;
  plan: ThreeStocksPlan | null;
  rejections: string[];
};

/** Gold pip = 0.10, so the institutional spread buffer of 1.5 pips = 0.15. */
export const SPREAD_BUFFER = 0.15;
const DAILY_TRADE_LIMIT = 2;
/** Mother candle must reach within this fraction of ATR of a major level. */
const SWEEP_TOLERANCE_ATR = 0.25;

export function atr14(candles: ReversalCandle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
  }
  const slice = trs.slice(-period);
  if (!slice.length) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** Confirmed fractal pivots (radius 2, strict comparison, no repaint). */
export function findSwings(
  candles: ReversalCandle[],
  timeframe: "H4" | "H1",
  radius = 2,
): MajorLevel[] {
  const out: MajorLevel[] = [];
  for (let i = radius; i < candles.length - radius; i++) {
    const c = candles[i];
    let isHigh = true;
    let isLow = true;
    for (let k = i - radius; k <= i + radius; k++) {
      if (k === i) continue;
      if (candles[k].h >= c.h) isHigh = false;
      if (candles[k].l <= c.l) isLow = false;
    }
    if (isHigh) out.push({ timeframe, kind: "HIGH", price: c.h, t: c.t });
    if (isLow) out.push({ timeframe, kind: "LOW", price: c.l, t: c.t });
  }
  return out;
}

/** Latest mother / inside-bar pair where the inside bar is the last closed candle. */
export function detectMotherInside(candles: ReversalCandle[]): ThreeStocksPattern | null {
  if (candles.length < 3) return null;
  const inside = candles[candles.length - 1];
  const mother = candles[candles.length - 2];
  if (!(inside.h <= mother.h && inside.l >= mother.l)) return null;
  const prior = candles[candles.length - 3];
  const bias =
    mother.c < mother.o && mother.l < prior.l
      ? "BULLISH_REVERSAL"
      : mother.c > mother.o && mother.h > prior.h
        ? "BEARISH_REVERSAL"
        : "UNRESOLVED";
  return {
    mother_t: mother.t,
    inside_t: inside.t,
    mother_high: mother.h,
    mother_low: mother.l,
    mother_range: mother.h - mother.l,
    inside_high: inside.h,
    inside_low: inside.l,
    mother_volume: Number.isFinite(mother.v) ? (mother.v as number) : null,
    inside_volume: Number.isFinite(inside.v) ? (inside.v as number) : null,
    direction_bias: bias,
  };
}

export function buildThreeStocksEvidence(input: {
  m30: ReversalCandle[];
  h4: ReversalCandle[];
  h1: ReversalCandle[];
  dailyTradesTaken?: number;
}): ThreeStocksEvidence {
  const { m30, h4, h1 } = input;
  const dailyTradesTaken = Math.max(0, Math.floor(input.dailyTradesTaken ?? 0));
  const engineLocked = dailyTradesTaken >= DAILY_TRADE_LIMIT;
  const atr = atr14(m30);
  const pattern = detectMotherInside(m30);
  const last = m30.at(-1) ?? null;
  const sessionInfo = last
    ? classifyNewYorkSession(last.t)
    : { session: "OFF_HOURS" as TradingSession, trade_allowed: false };
  const sessionAllowed =
    sessionInfo.session === "LONDON_OPEN" || sessionInfo.session === "NY_OPEN";

  const majorLevels = [...findSwings(h4, "H4"), ...findSwings(h1, "H1")]
    .sort((a, b) => a.t - b.t)
    .slice(-24);

  const rejections: string[] = [];
  const base: ThreeStocksEvidence = {
    module: "EXTREME_M30_GOLD_REVERSAL",
    status: "NO_PATTERN",
    timeframe: "M30",
    session: sessionInfo.session,
    session_allowed: sessionAllowed,
    atr_14: atr,
    daily_trades_taken: dailyTradesTaken,
    engine_locked: engineLocked,
    swept_level: null,
    major_levels: majorLevels,
    pattern,
    plan: null,
    rejections,
  };

  if (engineLocked) {
    rejections.push("Daily limit of 2 trades reached — engine locked for the rest of the day.");
    return { ...base, status: "ENGINE_LOCKED_DAILY_LIMIT" };
  }
  if (!pattern) {
    rejections.push("No mother / inside-bar pair on the last two closed M30 candles.");
    return base;
  }

  // Phase 1 — location: the mother candle must touch or sweep a major H4/H1 level.
  const tol = Math.max(atr * SWEEP_TOLERANCE_ATR, 0.2);
  const swept =
    majorLevels
      .filter((lvl) =>
        lvl.kind === "HIGH"
          ? pattern.mother_high >= lvl.price - tol
          : pattern.mother_low <= lvl.price + tol,
      )
      .sort(
        (a, b) =>
          Math.abs(a.price - (a.kind === "HIGH" ? pattern.mother_high : pattern.mother_low)) -
          Math.abs(b.price - (b.kind === "HIGH" ? pattern.mother_high : pattern.mother_low)),
      )[0] ?? null;
  if (!swept) {
    rejections.push(
      "Pattern formed away from any major H4/H1 swing level (mid-range consolidation) — ignored.",
    );
    return { ...base, status: "REJECTED_LOCATION" };
  }
  if (!sessionAllowed) {
    rejections.push(
      `Session ${sessionInfo.session} is outside London Open / New York Open — signal ignored.`,
    );
    return { ...base, swept_level: swept, status: "REJECTED_SESSION" };
  }
  // Phase 2 — anatomy.
  if (!(atr > 0) || pattern.mother_range < atr) {
    rejections.push(
      `Mother range ${pattern.mother_range.toFixed(2)} is below ATR(14) ${atr.toFixed(2)} — not an institutional move.`,
    );
    return { ...base, swept_level: swept, status: "REJECTED_VOLATILITY" };
  }
  if (
    pattern.mother_volume != null &&
    pattern.inside_volume != null &&
    pattern.mother_volume > 0 &&
    pattern.inside_volume >= pattern.mother_volume
  ) {
    rejections.push("Inside-bar volume did not dry up below the mother bar — no compression.");
    return { ...base, swept_level: swept, status: "REJECTED_VOLUME" };
  }

  // Phase 3 — direction comes from the swept side: a swept high sets up a
  // bearish reversal, a swept low a bullish one.
  const direction: "BUY" | "SELL" = swept.kind === "LOW" ? "BUY" : "SELL";
  const entry =
    direction === "BUY"
      ? pattern.mother_high + SPREAD_BUFFER
      : pattern.mother_low - SPREAD_BUFFER;
  const stopLoss =
    direction === "BUY"
      ? pattern.mother_low - SPREAD_BUFFER
      : pattern.mother_high + SPREAD_BUFFER;
  const risk = Math.abs(entry - stopLoss);
  const target = direction === "BUY" ? entry + risk * 3 : entry - risk * 3;
  const breakEven = direction === "BUY" ? entry + risk * 1.5 : entry - risk * 1.5;

  // Phase 4 — clean traffic to the 1:3 target on the M30 chart.
  const m30Swings = findSwings(m30.slice(0, -1), "H1");
  const opposing =
    direction === "BUY"
      ? m30Swings
          .filter((s) => s.kind === "HIGH" && s.price > entry)
          .sort((a, b) => a.price - b.price)[0]
      : m30Swings
          .filter((s) => s.kind === "LOW" && s.price < entry)
          .sort((a, b) => b.price - a.price)[0];
  const cleanTraffic = !opposing
    ? true
    : direction === "BUY"
      ? opposing.price >= target
      : opposing.price <= target;

  const plan: ThreeStocksPlan = {
    direction,
    entry,
    stop_loss: stopLoss,
    risk,
    target_1_3: target,
    break_even_trigger: breakEven,
    nearest_opposing_swing: opposing?.price ?? null,
    clean_traffic: cleanTraffic,
  };

  if (!cleanTraffic) {
    rejections.push(
      `Next major M30 swing at ${opposing?.price.toFixed(2)} sits before the 1:3 target ${target.toFixed(2)} — structure does not support the required RR.`,
    );
    return { ...base, swept_level: swept, plan, status: "REJECTED_RR_TRAFFIC" };
  }

  return {
    ...base,
    swept_level: swept,
    plan,
    status: direction === "BUY" ? "ARMED_BUY_STOP" : "ARMED_SELL_STOP",
  };
}
