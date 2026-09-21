/**
 * Institutional Quant Layer for XAU/USD.
 *
 * Deterministic, closed-candle only:
 *  - Volume Spread Analysis (VSA) to validate institutional participation
 *  - ATR(14) for dynamic risk pricing
 *  - HTF Draw on Liquidity (DOL) mapping
 *  - M30 Mother Candle / Inside Bar execution parameters
 *  - Algorithmic trade management (break-even trigger + ATR trail)
 *
 * Nothing here predicts outcomes. Every field is measured from candles that
 * have already closed, so the AI can quote levels instead of inventing them.
 */

export type QuantCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type VolumeStatus =
  | "HIGH_INSTITUTIONAL_ACTIVITY"
  | "AVERAGE_PARTICIPATION"
  | "LOW_RETAIL_CHOP"
  | "VOLUME_UNAVAILABLE";

export type VsaSignature =
  | "STOPPING_VOLUME"
  | "NO_DEMAND"
  | "NO_SUPPLY"
  | "CLIMACTIC_EFFORT"
  | "EFFORT_VS_RESULT_DIVERGENCE"
  | "NONE";

export type MotherInsideBar = {
  mother_index: number;
  inside_index: number;
  mother_t: number;
  inside_t: number;
  mother_high: number;
  mother_low: number;
  inside_high: number;
  inside_low: number;
  direction: "BUY" | "SELL" | "UNRESOLVED";
  inside_bar_count: number;
  broken: boolean;
};

export type QuantExecutionParams = {
  signal: "BUY_STOP" | "SELL_STOP" | "NO_TRADE";
  trigger_price: number;
  dynamic_sl: number;
  take_profit_absolute: number;
  rr_ratio: number;
  break_even_trigger_price: number;
  trail_activation_price: number;
  trail_distance: number;
};

export type QuantEvidence = {
  market_context: {
    htf_draw_on_liquidity: number | null;
    dol_side: "BUY_SIDE" | "SELL_SIDE" | "UNRESOLVED";
    mother_bar_volume_status: VolumeStatus;
    inside_bar_volume_status: VolumeStatus;
    vsa_signature: VsaSignature;
    atr_14_current: number;
    volume_available: boolean;
  };
  pattern: MotherInsideBar | null;
  execution_params: QuantExecutionParams | null;
  confluence_score: string;
  notes: string[];
};

const MIN_RR = 3;
const SL_BUFFER_ATR = 0.25;
const TRIGGER_BUFFER_ATR = 0.05;

export function computeAtr(candles: QuantCandle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    trs.push(
      Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c)),
    );
  }
  const window = trs.slice(-period);
  if (!window.length) return 0;
  return window.reduce((a, b) => a + b, 0) / window.length;
}

/** Average volume of the `lookback` bars that precede `index`. */
function averageVolume(candles: QuantCandle[], index: number, lookback = 20): number {
  const start = Math.max(0, index - lookback);
  const slice = candles.slice(start, index);
  if (!slice.length) return 0;
  return slice.reduce((a, b) => a + (b.v || 0), 0) / slice.length;
}

export function classifyVolume(
  candles: QuantCandle[],
  index: number,
  lookback = 20,
): VolumeStatus {
  const bar = candles[index];
  if (!bar || !Number.isFinite(bar.v) || bar.v <= 0) return "VOLUME_UNAVAILABLE";
  const avg = averageVolume(candles, index, lookback);
  if (avg <= 0) return "VOLUME_UNAVAILABLE";
  const ratio = bar.v / avg;
  if (ratio >= 1.5) return "HIGH_INSTITUTIONAL_ACTIVITY";
  if (ratio <= 0.7) return "LOW_RETAIL_CHOP";
  return "AVERAGE_PARTICIPATION";
}

/**
 * Classic VSA effort-vs-result read on the latest closed candle: wide spread on
 * high volume that closes poorly is stopping/climactic effort, narrow spread on
 * low volume is a lack of interest.
 */
export function classifyVsa(candles: QuantCandle[], index: number): VsaSignature {
  const bar = candles[index];
  if (!bar) return "NONE";
  const status = classifyVolume(candles, index);
  if (status === "VOLUME_UNAVAILABLE") return "NONE";
  const range = bar.h - bar.l;
  if (range <= 0) return "NONE";
  const body = Math.abs(bar.c - bar.o);
  const closePos = (bar.c - bar.l) / range;
  const atr = computeAtr(candles.slice(0, index + 1));
  const wide = atr > 0 && range >= atr * 1.3;
  const narrow = atr > 0 && range <= atr * 0.6;

  if (status === "HIGH_INSTITUTIONAL_ACTIVITY") {
    if (wide && closePos <= 0.35) return "STOPPING_VOLUME";
    if (wide && closePos >= 0.65) return "CLIMACTIC_EFFORT";
    if (narrow || body <= range * 0.3) return "EFFORT_VS_RESULT_DIVERGENCE";
  }
  if (status === "LOW_RETAIL_CHOP" && narrow) {
    return bar.c >= bar.o ? "NO_DEMAND" : "NO_SUPPLY";
  }
  return "NONE";
}

/**
 * Latest Mother Candle + Inside Bar formation. The mother bar must have a range
 * of at least one ATR; every following inside bar must sit fully inside it.
 */
export function detectMotherInsideBar(candles: QuantCandle[]): MotherInsideBar | null {
  if (candles.length < 5) return null;
  const atr = computeAtr(candles);
  for (let i = candles.length - 1; i >= 2; i--) {
    const mother = candles[i - 1];
    const inside = candles[i];
    if (!mother || !inside) continue;
    const motherRange = mother.h - mother.l;
    if (atr > 0 && motherRange < atr) continue;
    if (!(inside.h <= mother.h && inside.l >= mother.l)) continue;

    let count = 1;
    let broken = false;
    let direction: MotherInsideBar["direction"] = "UNRESOLVED";
    for (let j = i + 1; j < candles.length; j++) {
      const next = candles[j];
      if (next.h <= mother.h && next.l >= mother.l) {
        count += 1;
        continue;
      }
      broken = true;
      direction = next.c > mother.h ? "BUY" : next.c < mother.l ? "SELL" : "UNRESOLVED";
      break;
    }
    return {
      mother_index: i - 1,
      inside_index: i,
      mother_t: mother.t,
      inside_t: inside.t,
      mother_high: mother.h,
      mother_low: mother.l,
      inside_high: inside.h,
      inside_low: inside.l,
      direction,
      inside_bar_count: count,
      broken,
    };
  }
  return null;
}

/**
 * Break-even and trailing rules for a funded-account style risk model:
 * move to break-even at 1R, start trailing by one ATR from 1.5R.
 */
export function buildTradeManagement(
  direction: "BUY" | "SELL",
  entry: number,
  stop: number,
  atr: number,
): { break_even_trigger_price: number; trail_activation_price: number; trail_distance: number } {
  const risk = Math.abs(entry - stop);
  const sign = direction === "BUY" ? 1 : -1;
  return {
    break_even_trigger_price: round2(entry + sign * risk),
    trail_activation_price: round2(entry + sign * risk * 1.5),
    trail_distance: round2(atr > 0 ? atr : risk),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * HTF Draw on Liquidity: the nearest unswept pool on the side price is drawn
 * toward. Callers pass pools already measured from higher timeframe candles.
 */
export function resolveDrawOnLiquidity(
  price: number,
  pools: Array<{ price_level: number; status?: string; type?: string }>,
  bias: "BUY" | "SELL" | "UNRESOLVED",
): { level: number | null; side: "BUY_SIDE" | "SELL_SIDE" | "UNRESOLVED" } {
  const live = pools.filter((p) => (p.status ?? "UNSWEPT") !== "SWEPT");
  const above = live
    .filter((p) => p.price_level > price)
    .sort((a, b) => a.price_level - b.price_level);
  const below = live
    .filter((p) => p.price_level < price)
    .sort((a, b) => b.price_level - a.price_level);
  if (bias === "BUY" && above[0]) return { level: above[0].price_level, side: "BUY_SIDE" };
  if (bias === "SELL" && below[0]) return { level: below[0].price_level, side: "SELL_SIDE" };
  if (above[0] && below[0]) {
    const nearAbove = above[0].price_level - price;
    const nearBelow = price - below[0].price_level;
    return nearAbove <= nearBelow
      ? { level: above[0].price_level, side: "BUY_SIDE" }
      : { level: below[0].price_level, side: "SELL_SIDE" };
  }
  if (above[0]) return { level: above[0].price_level, side: "BUY_SIDE" };
  if (below[0]) return { level: below[0].price_level, side: "SELL_SIDE" };
  return { level: null, side: "UNRESOLVED" };
}

export function buildQuantEvidence(input: {
  candles: QuantCandle[];
  liquidityPools?: Array<{ price_level: number; status?: string; type?: string }>;
  trendState?: "BULLISH" | "BEARISH" | "SIDEWAYS" | null;
  currentPrice?: number;
}): QuantEvidence {
  const candles = input.candles.filter(
    (c) => Number.isFinite(c.o) && Number.isFinite(c.h) && Number.isFinite(c.l) && Number.isFinite(c.c),
  );
  const notes: string[] = [];
  const atr = round2(computeAtr(candles));
  const lastIndex = candles.length - 1;
  const price = input.currentPrice ?? candles[lastIndex]?.c ?? 0;
  const volumeAvailable = candles.slice(-30).some((c) => Number.isFinite(c.v) && c.v > 0);
  if (!volumeAvailable) notes.push("No volume feed for this series — VSA validation unavailable.");

  const pattern = detectMotherInsideBar(candles);
  const motherVolume = pattern
    ? classifyVolume(candles, pattern.mother_index)
    : ("VOLUME_UNAVAILABLE" as VolumeStatus);
  const insideVolume = pattern
    ? classifyVolume(candles, pattern.inside_index)
    : ("VOLUME_UNAVAILABLE" as VolumeStatus);
  const vsa = lastIndex >= 0 ? classifyVsa(candles, lastIndex) : "NONE";

  const patternBias: "BUY" | "SELL" | "UNRESOLVED" = pattern
    ? pattern.direction !== "UNRESOLVED"
      ? pattern.direction
      : input.trendState === "BULLISH"
        ? "BUY"
        : input.trendState === "BEARISH"
          ? "SELL"
          : "UNRESOLVED"
    : input.trendState === "BULLISH"
      ? "BUY"
      : input.trendState === "BEARISH"
        ? "SELL"
        : "UNRESOLVED";

  const dol = resolveDrawOnLiquidity(price, input.liquidityPools ?? [], patternBias);

  let execution: QuantExecutionParams | null = null;
  if (pattern && !pattern.broken && patternBias !== "UNRESOLVED" && atr > 0) {
    const buffer = round2(atr * TRIGGER_BUFFER_ATR);
    const slBuffer = round2(atr * SL_BUFFER_ATR);
    const direction = patternBias;
    const trigger =
      direction === "BUY"
        ? round2(pattern.inside_high + buffer)
        : round2(pattern.inside_low - buffer);
    const stop =
      direction === "BUY"
        ? round2(pattern.mother_low - slBuffer)
        : round2(pattern.mother_high + slBuffer);
    const risk = Math.abs(trigger - stop);
    if (risk > 0) {
      const target =
        direction === "BUY" ? round2(trigger + risk * MIN_RR) : round2(trigger - risk * MIN_RR);
      const management = buildTradeManagement(direction, trigger, stop, atr);
      execution = {
        signal: direction === "BUY" ? "BUY_STOP" : "SELL_STOP",
        trigger_price: trigger,
        dynamic_sl: stop,
        take_profit_absolute: target,
        rr_ratio: MIN_RR,
        ...management,
      };
      if (dol.level != null) {
        const towardsDol = direction === "BUY" ? dol.level > trigger : dol.level < trigger;
        if (!towardsDol) {
          notes.push("Draw on liquidity sits against the pattern break — treat the setup as low grade.");
        }
      }
    }
  } else if (pattern?.broken) {
    notes.push("Latest mother/inside formation already broke — parameters are historical, not live.");
  } else if (!pattern) {
    notes.push("No qualifying mother candle + inside bar in the supplied window.");
  } else if (patternBias === "UNRESOLVED") {
    notes.push("Mother/inside formation is unresolved — no directional bias, so no order parameters.");
  }

  const confluences = [
    pattern && !pattern.broken,
    motherVolume === "HIGH_INSTITUTIONAL_ACTIVITY",
    insideVolume === "LOW_RETAIL_CHOP",
    input.trendState === "BULLISH" || input.trendState === "BEARISH",
    dol.level != null,
  ].filter(Boolean).length;

  return {
    market_context: {
      htf_draw_on_liquidity: dol.level,
      dol_side: dol.side,
      mother_bar_volume_status: motherVolume,
      inside_bar_volume_status: insideVolume,
      vsa_signature: vsa,
      atr_14_current: atr,
      volume_available: volumeAvailable,
    },
    pattern,
    execution_params: execution,
    confluence_score: `${confluences}/5 (SMC + VSA + MTF + M30_PATTERN + DOL)`,
    notes,
  };
}
