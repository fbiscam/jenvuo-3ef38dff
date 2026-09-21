/**
 * Apex Predator Engine for XAU/USD — the final validation layer on top of the
 * SMC / quant stack.
 *
 * Deterministic and closed-candle only:
 *  - Order flow proxy: Cumulative Volume Delta (CVD) + bid/ask imbalance
 *  - Macro intermarket triangulation (DXY + US10Y local H1 structure)
 *  - Advanced ICT geometry: Inversion FVG (IFVG) and Balanced Price Range (BPR)
 *  - LBMA London Gold Fix manipulation filter (10:30 / 15:00 Europe/London)
 *
 * Nothing here forecasts an outcome. Broker level-2 tape is not available, so
 * delta is a candle-derived proxy and is labelled as such. Grades are checklist
 * counts, never probabilities.
 */

export type ApexCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

export type ApexFvg = {
  type: "BULLISH_FVG" | "BEARISH_FVG";
  index: number;
  t: number;
  top: number;
  bottom: number;
  status: "UNMITIGATED" | "PARTIAL" | "MITIGATED";
};

export type CvdStatus =
  | "CONFIRMED_BUY_ABSORPTION"
  | "CONFIRMED_SELL_ABSORPTION"
  | "NO_DIVERGENCE"
  | "ORDER_FLOW_UNAVAILABLE";

export type ImbalanceStatus =
  | "BUY_IMBALANCE_3X"
  | "SELL_IMBALANCE_3X"
  | "NO_IMBALANCE"
  | "ORDER_FLOW_UNAVAILABLE";

export type MacroTrend = "BULLISH" | "BEARISH" | "NEUTRAL" | "UNAVAILABLE";

export type MacroAlignment =
  | "PERFECT_BUY"
  | "PERFECT_SELL"
  | "MACRO_DIVERGENCE"
  | "NO_ALIGNMENT"
  | "UNAVAILABLE";

export type LbmaFixStatus =
  | "PRE_FIX_BLACKOUT"
  | "POST_FIX_WINDOW"
  | "CLEAR_OF_FIX"
  | "UNAVAILABLE";

export type InversionFvg = {
  type: "BULLISH_IFVG" | "BEARISH_IFVG";
  top: number;
  bottom: number;
  inverted_t: number;
  retested: boolean;
  fresh: boolean;
};

export type BalancedPriceRange = {
  top: number;
  bottom: number;
  t: number;
  status: "UNMITIGATED" | "PARTIAL" | "MITIGATED";
};

export type ApexAction =
  | "EXECUTE_MARKET_BUY"
  | "EXECUTE_MARKET_SELL"
  | "ARM_BUY_STOP"
  | "ARM_SELL_STOP"
  | "WAIT_FOR_LBMA_FIX"
  | "REDUCE_RISK_MACRO_DIVERGENCE"
  | "ABORT_MACRO_CONFLICT"
  | "ABORT_ORDER_FLOW"
  | "NO_SETUP";

export type ApexEvidence = {
  system_mode: "APEX_PREDATOR";
  instrument: string;
  apex_validations: {
    cvd_delta_divergence: CvdStatus;
    footprint_imbalance: ImbalanceStatus;
    macro_triangulation: {
      us10y_trend: MacroTrend;
      dxy_trend: MacroTrend;
      gold_alignment: MacroAlignment;
    };
    ict_geometry: string;
    lbma_fix_status: LbmaFixStatus;
  };
  geometry: {
    inversion_fvgs: InversionFvg[];
    balanced_price_ranges: BalancedPriceRange[];
    apex_a_plus_setup: boolean;
  };
  trade_execution: {
    action: ApexAction;
    direction: "BUY" | "SELL" | "NONE";
    entry_zone: number | null;
    invalidation_level: number | null;
    primary_liquidity_target: number | null;
    dynamic_risk_allocation: string;
    apex_confluence_score: string;
  };
  notes: string[];
};

const IMBALANCE_RATIO = 3;
const LONDON_FIX_MINUTES = [10 * 60 + 30, 15 * 60];
const PRE_FIX_BLACKOUT_MIN = 15;
const POST_FIX_WINDOW_MIN = 45;

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function hasVolume(candles: ApexCandle[]): boolean {
  return candles.slice(-40).some((c) => Number.isFinite(c.v) && (c.v ?? 0) > 0);
}

/** Candle-derived buy/sell volume split (no level-2 tape available). */
export function splitVolume(candle: ApexCandle): { buy: number; sell: number } {
  const range = candle.h - candle.l;
  const volume = Number.isFinite(candle.v) ? (candle.v ?? 0) : 0;
  if (range <= 0 || volume <= 0) return { buy: 0, sell: 0 };
  const buyShare = (candle.c - candle.l) / range;
  return { buy: volume * buyShare, sell: volume * (1 - buyShare) };
}

/** Cumulative Volume Delta proxy, one running value per closed candle. */
export function computeCvd(candles: ApexCandle[]): number[] {
  let running = 0;
  return candles.map((candle) => {
    const { buy, sell } = splitVolume(candle);
    running += buy - sell;
    return running;
  });
}

/**
 * Delta divergence: price makes an equal/lower low while CVD makes a higher low
 * (passive limit buyers absorbing aggressive sellers), or the mirror for sells.
 */
export function detectCvdDivergence(candles: ApexCandle[], lookback = 12): CvdStatus {
  if (!hasVolume(candles)) return "ORDER_FLOW_UNAVAILABLE";
  const window = candles.slice(-lookback);
  if (window.length < 6) return "NO_DIVERGENCE";
  const cvd = computeCvd(window);
  const half = Math.floor(window.length / 2);
  const first = window.slice(0, half);
  const second = window.slice(half);
  const idxOf = (arr: ApexCandle[], pick: (a: ApexCandle, b: ApexCandle) => boolean) =>
    arr.reduce((best, cur, i) => (pick(cur, arr[best]) ? i : best), 0);

  const lowA = idxOf(first, (a, b) => a.l < b.l);
  const lowB = half + idxOf(second, (a, b) => a.l < b.l);
  const highA = idxOf(first, (a, b) => a.h > b.h);
  const highB = half + idxOf(second, (a, b) => a.h > b.h);
  const tol = (Math.max(...window.map((c) => c.h)) - Math.min(...window.map((c) => c.l))) * 0.1;

  if (window[lowB].l <= window[lowA].l + tol && cvd[lowB] > cvd[lowA]) {
    return "CONFIRMED_BUY_ABSORPTION";
  }
  if (window[highB].h >= window[highA].h - tol && cvd[highB] < cvd[highA]) {
    return "CONFIRMED_SELL_ABSORPTION";
  }
  return "NO_DIVERGENCE";
}

/** 3x bid/ask imbalance proxy on the trigger candle. */
export function detectFootprintImbalance(candle: ApexCandle | undefined): ImbalanceStatus {
  if (!candle) return "ORDER_FLOW_UNAVAILABLE";
  const { buy, sell } = splitVolume(candle);
  if (buy <= 0 && sell <= 0) return "ORDER_FLOW_UNAVAILABLE";
  if (sell > 0 && buy / sell >= IMBALANCE_RATIO) return "BUY_IMBALANCE_3X";
  if (buy > 0 && sell / buy >= IMBALANCE_RATIO) return "SELL_IMBALANCE_3X";
  if (sell <= 0) return "BUY_IMBALANCE_3X";
  if (buy <= 0) return "SELL_IMBALANCE_3X";
  return "NO_IMBALANCE";
}

/** Local H1 structure read for a macro series (DXY / US10Y). */
export function classifyMacroTrend(candles: ApexCandle[] | undefined): MacroTrend {
  if (!candles || candles.length < 12) return "UNAVAILABLE";
  const window = candles.slice(-30);
  const closes = window.map((c) => c.c);
  const sma = closes.reduce((a, b) => a + b, 0) / closes.length;
  const last = closes[closes.length - 1];
  const priorHigh = Math.max(...window.slice(0, Math.floor(window.length / 2)).map((c) => c.h));
  const priorLow = Math.min(...window.slice(0, Math.floor(window.length / 2)).map((c) => c.l));
  if (last > sma && last > priorHigh) return "BULLISH";
  if (last < sma && last < priorLow) return "BEARISH";
  if (last > sma * 1.001) return "BULLISH";
  if (last < sma * 0.999) return "BEARISH";
  return "NEUTRAL";
}

export function triangulateMacro(dxy: MacroTrend, us10y: MacroTrend): MacroAlignment {
  if (dxy === "UNAVAILABLE" || us10y === "UNAVAILABLE") return "UNAVAILABLE";
  if (dxy === "BEARISH" && us10y === "BEARISH") return "PERFECT_BUY";
  if (dxy === "BULLISH" && us10y === "BULLISH") return "PERFECT_SELL";
  if (
    (dxy === "BULLISH" && us10y === "BEARISH") ||
    (dxy === "BEARISH" && us10y === "BULLISH")
  ) {
    return "MACRO_DIVERGENCE";
  }
  return "NO_ALIGNMENT";
}

/** LBMA Gold Fix blackout, evaluated in Europe/London wall-clock time. */
export function classifyLbmaFix(timestamp: number): {
  status: LbmaFixStatus;
  london_time: string;
} {
  if (!Number.isFinite(timestamp)) return { status: "UNAVAILABLE", london_time: "n/a" };
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { status: "UNAVAILABLE", london_time: "n/a" };
  }
  const mins = hour * 60 + minute;
  const londonTime = `${get("weekday")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} London`;
  for (const fix of LONDON_FIX_MINUTES) {
    if (mins >= fix - PRE_FIX_BLACKOUT_MIN && mins < fix) {
      return { status: "PRE_FIX_BLACKOUT", london_time: londonTime };
    }
    if (mins >= fix && mins <= fix + POST_FIX_WINDOW_MIN) {
      return { status: "POST_FIX_WINDOW", london_time: londonTime };
    }
  }
  return { status: "CLEAR_OF_FIX", london_time: londonTime };
}

function averageRange(candles: ApexCandle[], end: number, len = 14): number {
  const start = Math.max(0, end - len + 1);
  let sum = 0;
  let n = 0;
  for (let i = start; i <= end; i += 1) {
    const c = candles[i];
    if (!c) continue;
    sum += c.h - c.l;
    n += 1;
  }
  return n ? sum / n : 0;
}

/**
 * An FVG violated by a strong body close flips polarity and becomes an IFVG.
 * "fresh" means price has not traded back into it since the inversion.
 */
export function detectInversionFvgs(candles: ApexCandle[], fvgs: ApexFvg[]): InversionFvg[] {
  const out: InversionFvg[] = [];
  for (const gap of fvgs) {
    const bullish = gap.type === "BULLISH_FVG";
    for (let i = gap.index + 1; i < candles.length; i += 1) {
      const c = candles[i];
      if (!c) continue;
      const body = Math.abs(c.c - c.o);
      const atr = averageRange(candles, i);
      const strong = atr > 0 ? body >= atr * 0.6 : body > 0;
      const violated = bullish ? c.c < gap.bottom : c.c > gap.top;
      if (!violated || !strong) continue;
      let retested = false;
      for (let j = i + 1; j < candles.length; j += 1) {
        const k = candles[j];
        if (!k) continue;
        if (k.h >= gap.bottom && k.l <= gap.top) {
          retested = true;
          break;
        }
      }
      out.push({
        type: bullish ? "BEARISH_IFVG" : "BULLISH_IFVG",
        top: round2(gap.top),
        bottom: round2(gap.bottom),
        inverted_t: c.t,
        retested,
        fresh: !retested,
      });
      break;
    }
  }
  return out.slice(-6);
}

/** Overlap between an opposing bullish and bearish FVG = Balanced Price Range. */
export function detectBalancedPriceRanges(fvgs: ApexFvg[]): BalancedPriceRange[] {
  const out: BalancedPriceRange[] = [];
  const bull = fvgs.filter((g) => g.type === "BULLISH_FVG");
  const bear = fvgs.filter((g) => g.type === "BEARISH_FVG");
  for (const a of bull) {
    for (const b of bear) {
      const top = Math.min(a.top, b.top);
      const bottom = Math.max(a.bottom, b.bottom);
      if (top <= bottom) continue;
      const status =
        a.status === "MITIGATED" && b.status === "MITIGATED"
          ? "MITIGATED"
          : a.status === "UNMITIGATED" && b.status === "UNMITIGATED"
            ? "UNMITIGATED"
            : "PARTIAL";
      out.push({ top: round2(top), bottom: round2(bottom), t: Math.max(a.t, b.t), status });
    }
  }
  return out.sort((x, y) => x.t - y.t).slice(-4);
}

function zoneOverlaps(price: number | null, zone: { top: number; bottom: number }): boolean {
  if (price == null) return false;
  const pad = (zone.top - zone.bottom) * 0.25;
  return price >= zone.bottom - pad && price <= zone.top + pad;
}

export function buildApexEvidence(input: {
  candles: ApexCandle[];
  fvgs?: ApexFvg[];
  dxyCandles?: ApexCandle[];
  us10yCandles?: ApexCandle[];
  direction?: "BUY" | "SELL" | "UNRESOLVED" | null;
  entry?: number | null;
  stopLoss?: number | null;
  target?: number | null;
  patternInsideT?: number | null;
  currentPrice?: number;
  now?: number;
  instrument?: string;
}): ApexEvidence {
  const candles = input.candles.filter(
    (c) =>
      Number.isFinite(c.o) && Number.isFinite(c.h) && Number.isFinite(c.l) && Number.isFinite(c.c),
  );
  const notes: string[] = [];
  const price = input.currentPrice ?? candles.at(-1)?.c ?? null;
  const direction = input.direction && input.direction !== "UNRESOLVED" ? input.direction : null;

  const cvd = detectCvdDivergence(candles);
  const imbalance = detectFootprintImbalance(candles.at(-1));
  if (cvd === "ORDER_FLOW_UNAVAILABLE" || imbalance === "ORDER_FLOW_UNAVAILABLE") {
    notes.push(
      "No volume/tape feed on this series — CVD and footprint imbalance are unverified, not confirmed.",
    );
  }

  const dxyTrend = classifyMacroTrend(input.dxyCandles);
  const us10yTrend = classifyMacroTrend(input.us10yCandles);
  const alignment = triangulateMacro(dxyTrend, us10yTrend);
  const fix = classifyLbmaFix(input.now ?? candles.at(-1)?.t ?? Date.now());

  const fvgs = input.fvgs ?? [];
  const inversions = detectInversionFvgs(candles, fvgs);
  const bprs = detectBalancedPriceRanges(fvgs);
  const freshIfvgAtPattern = inversions.find(
    (ifvg) =>
      ifvg.fresh ||
      (input.patternInsideT != null && zoneOverlaps(price, ifvg) && ifvg.inverted_t < input.patternInsideT),
  );
  const patternOnIfvg = Boolean(freshIfvgAtPattern && zoneOverlaps(price, freshIfvgAtPattern));
  const patternOnBpr = bprs.some((b) => b.status !== "MITIGATED" && zoneOverlaps(price, b));
  const geometry = patternOnIfvg
    ? "IFVG_RETEST_CONFIRMED"
    : patternOnBpr
      ? "BPR_EDGE_REACTION"
      : inversions.length
        ? "IFVG_MAPPED_NO_RETEST"
        : "NO_ADVANCED_GEOMETRY";

  // Aggregate the execution verdict.
  let action: ApexAction = "NO_SETUP";
  let risk = "0% (no validated setup)";
  if (!direction) {
    notes.push("No directional setup supplied by the SMC/quant layer — Apex stays flat.");
  } else {
    const macroConflict =
      (direction === "BUY" && alignment === "PERFECT_SELL") ||
      (direction === "SELL" && alignment === "PERFECT_BUY");
    const macroPerfect =
      (direction === "BUY" && alignment === "PERFECT_BUY") ||
      (direction === "SELL" && alignment === "PERFECT_SELL");
    const flowAgainst =
      (direction === "BUY" && (cvd === "CONFIRMED_SELL_ABSORPTION" || imbalance === "SELL_IMBALANCE_3X")) ||
      (direction === "SELL" && (cvd === "CONFIRMED_BUY_ABSORPTION" || imbalance === "BUY_IMBALANCE_3X"));
    const flowWith =
      (direction === "BUY" && (cvd === "CONFIRMED_BUY_ABSORPTION" || imbalance === "BUY_IMBALANCE_3X")) ||
      (direction === "SELL" && (cvd === "CONFIRMED_SELL_ABSORPTION" || imbalance === "SELL_IMBALANCE_3X"));

    if (macroConflict) {
      action = "ABORT_MACRO_CONFLICT";
      risk = "0% (DXY/US10Y point against the setup)";
      notes.push("Macro triangulation opposes the setup direction — stand down.");
    } else if (flowAgainst) {
      action = "ABORT_ORDER_FLOW";
      risk = "0% (delta contradicts the break)";
      notes.push("Order flow proxy contradicts the intended break direction.");
    } else if (fix.status === "PRE_FIX_BLACKOUT") {
      action = "WAIT_FOR_LBMA_FIX";
      risk = "0% until the fix prints";
      notes.push(
        "Inside the 15-minute LBMA Gold Fix blackout — wait for the fix sweep and a confirmed break afterwards.",
      );
    } else if (alignment === "MACRO_DIVERGENCE") {
      action = "REDUCE_RISK_MACRO_DIVERGENCE";
      risk = "0.5% (DXY and US10Y diverge)";
    } else if (patternOnIfvg && macroPerfect && flowWith) {
      action = direction === "BUY" ? "EXECUTE_MARKET_BUY" : "EXECUTE_MARKET_SELL";
      risk = "2.0% (A+ setup checklist complete)";
    } else {
      action = direction === "BUY" ? "ARM_BUY_STOP" : "ARM_SELL_STOP";
      risk = macroPerfect || flowWith ? "1.0% (partial confluence)" : "0.5% (base confluence)";
    }
  }

  const checks = [
    cvd === "CONFIRMED_BUY_ABSORPTION" || cvd === "CONFIRMED_SELL_ABSORPTION",
    imbalance === "BUY_IMBALANCE_3X" || imbalance === "SELL_IMBALANCE_3X",
    alignment === "PERFECT_BUY" || alignment === "PERFECT_SELL",
    patternOnIfvg || patternOnBpr,
    fix.status !== "PRE_FIX_BLACKOUT" && fix.status !== "UNAVAILABLE",
  ].filter(Boolean).length;

  return {
    system_mode: "APEX_PREDATOR",
    instrument: input.instrument ?? "XAUUSD",
    apex_validations: {
      cvd_delta_divergence: cvd,
      footprint_imbalance: imbalance,
      macro_triangulation: {
        us10y_trend: us10yTrend,
        dxy_trend: dxyTrend,
        gold_alignment: alignment,
      },
      ict_geometry: geometry,
      lbma_fix_status: fix.status,
    },
    geometry: {
      inversion_fvgs: inversions,
      balanced_price_ranges: bprs,
      apex_a_plus_setup: patternOnIfvg,
    },
    trade_execution: {
      action,
      direction: direction ?? "NONE",
      entry_zone: input.entry ?? null,
      invalidation_level: input.stopLoss ?? null,
      primary_liquidity_target: input.target ?? null,
      dynamic_risk_allocation: risk,
      apex_confluence_score: `${checks}/5 Apex checks passed (checklist count, not a probability or win rate)`,
    },
    notes: [...notes, `LBMA clock: ${fix.london_time}.`],
  };
}
