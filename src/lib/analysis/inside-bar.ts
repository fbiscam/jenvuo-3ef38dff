// Gold-only 30-minute Mother Candle / Inside Bar reversal engine.
// This is the single deterministic strategy the extension runs. Nothing here
// uses ICT/SMC confluence stacking: a trade exists only when a fresh swing
// extreme is followed by an inside bar on the closed 30m chart.

export type IbCandle = { t: number; o: number; h: number; l: number; c: number };

export type InsideBarTrade = {
  direction: "BUY" | "SELL" | "WAIT";
  entryType: "STOP";
  entry: number;
  sl: number;
  tp: number;
  tp1: number;
  tp2: number;
  rr: number;
  zone: { kind: "MOTHER"; priceLow: number; priceHigh: number } | null;
};

export type InsideBarResult = {
  text: string;
  direction: "BUY" | "SELL" | "WAIT";
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  trade: InsideBarTrade;
  senior: { included: boolean; status: "completed"; reasons: string[] };
  marks: Array<Record<string, string | number>>;
  pattern: {
    found: boolean;
    motherHigh: number;
    motherLow: number;
    babyHigh: number;
    babyLow: number;
    babyCount: number;
    barsSinceBaby: number;
    freshExtreme: "HIGH" | "LOW" | null;
  };
};

export const IB_TIMEFRAME = "30m";
export const IB_SYMBOL = "XAUUSD";
export const IB_MIN_RR = 3;
export const IB_STRATEGY_MODEL = "rules-engine/gold-30m-inside-bar";

const FRESH_LOOKBACK = 20; // candles used to qualify a fresh high / low
const MAX_BARS_SINCE_BABY = 3; // the pattern must still be live
const MAX_RISK_PCT = 0.006; // mother candle wider than this is untradeable

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function normalizeCandles(raw: Array<Record<string, unknown>>): IbCandle[] {
  return raw
    .map((c) => ({
      t: num(c["t"] ?? c["time"]),
      o: num(c["o"] ?? c["open"]),
      h: num(c["h"] ?? c["high"]),
      l: num(c["l"] ?? c["low"]),
      c: num(c["c"] ?? c["close"]),
    }))
    .filter((c) => [c.o, c.h, c.l, c.c].every((n) => Number.isFinite(n) && n > 0));
}

function isInside(mother: IbCandle, baby: IbCandle): boolean {
  return baby.h <= mother.h && baby.l >= mother.l;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Deterministic 30m inside-bar reversal read for gold.
 * Direction rule: an inside bar after a fresh high is a short, after a fresh
 * low it is a long. Stop always sits at the opposite end of the mother candle
 * and the plan is discarded below a 1:3 reward.
 */
export function runInsideBarDesk(input: {
  candles: Array<Record<string, unknown>>;
  livePrice: number;
  decimals?: number;
}): InsideBarResult {
  const decimals = input.decimals ?? 2;
  const candles = normalizeCandles(input.candles);
  const price = num(input.livePrice);
  const reasons: string[] = [];

  const empty = (reason: string, pattern?: Partial<InsideBarResult["pattern"]>): InsideBarResult => ({
    text: [
      "GOLD 30M MOTHER / INSIDE BAR ENGINE",
      `Live price: ${Number.isFinite(price) ? price.toFixed(decimals) : "unavailable"}`,
      "Setup: NONE",
      `Reason: ${reason}`,
      "Rule: only a fresh 30m high or low followed by an inside bar is tradeable.",
    ].join("\n"),
    direction: "WAIT",
    bias: "NEUTRAL",
    trade: {
      direction: "WAIT",
      entryType: "STOP",
      entry: 0,
      sl: 0,
      tp: 0,
      tp1: 0,
      tp2: 0,
      rr: 0,
      zone: null,
    },
    senior: { included: true, status: "completed", reasons: [reason, ...reasons] },
    marks: [],
    pattern: {
      found: false,
      motherHigh: 0,
      motherLow: 0,
      babyHigh: 0,
      babyLow: 0,
      babyCount: 0,
      barsSinceBaby: 0,
      freshExtreme: null,
      ...pattern,
    },
  });

  if (candles.length < FRESH_LOOKBACK + 5) {
    return empty("Not enough closed 30-minute candles to validate the pattern.");
  }
  if (!Number.isFinite(price) || price <= 0) {
    return empty("Live gold price could not be verified.");
  }

  // Search backwards for the most recent complete three-candle formation:
  // mother at the fresh extreme, one inside bar, then one confirmation candle.
  let motherIndex = -1;
  let lastBabyIndex = -1;
  for (let i = candles.length - 3; i >= FRESH_LOOKBACK; i--) {
    const mother = candles[i] as IbCandle;
    const next = candles[i + 1] as IbCandle;
    if (!isInside(mother, next)) continue;
    motherIndex = i;
    lastBabyIndex = i + 1;
    break;
  }

  if (motherIndex < 0) {
    return empty("No mother candle with an inside bar on the closed 30-minute chart.");
  }

  const mother = candles[motherIndex] as IbCandle;
  const babies = candles.slice(motherIndex + 1, lastBabyIndex + 1);
  const babyHigh = Math.max(...babies.map((c) => c.h));
  const babyLow = Math.min(...babies.map((c) => c.l));
  const barsSinceBaby = candles.length - 1 - lastBabyIndex;

  const history = candles.slice(motherIndex - FRESH_LOOKBACK, motherIndex);
  const priorHigh = Math.max(...history.map((c) => c.h));
  const priorLow = Math.min(...history.map((c) => c.l));
  const freshHigh = mother.h > priorHigh;
  const freshLow = mother.l < priorLow;

  const basePattern = {
    found: true,
    motherHigh: mother.h,
    motherLow: mother.l,
    babyHigh,
    babyLow,
    babyCount: babies.length,
    barsSinceBaby,
    freshExtreme: (freshHigh ? "HIGH" : freshLow ? "LOW" : null) as "HIGH" | "LOW" | null,
  };

  if (!freshHigh && !freshLow) {
    return empty(
      "The mother candle did not print a fresh 30-minute high or low, so there is no reversal to trade.",
      basePattern,
    );
  }
  if (freshHigh && freshLow) {
    return empty("The mother candle engulfed both extremes; the reversal side is ambiguous.", basePattern);
  }
  if (barsSinceBaby > MAX_BARS_SINCE_BABY) {
    return empty(
      `The inside bar formed ${barsSinceBaby} candles ago, so the setup is stale.`,
      basePattern,
    );
  }

  const direction: "BUY" | "SELL" = freshLow ? "BUY" : "SELL";

  // The mother must show the reversal direction. The baby candle's colour is
  // irrelevant. Only the third candle must confirm the same reversal direction.
  const bodyDir = (c: IbCandle): "BUY" | "SELL" | "FLAT" =>
    c.c > c.o ? "BUY" : c.c < c.o ? "SELL" : "FLAT";
  const colourWord = direction === "BUY" ? "bullish (green)" : "bearish (red)";

  if (bodyDir(mother) !== direction) {
    return empty(
      `The candle after the fresh ${freshLow ? "low" : "high"} is not ${colourWord}, so the reversal is not confirmed.`,
      basePattern,
    );
  }
  const confirmation = candles[lastBabyIndex + 1] as IbCandle | undefined;
  if (!confirmation) {
    return empty(
      "Waiting for the third candle after the inside bar to close and confirm the direction.",
      basePattern,
    );
  }
  if (bodyDir(confirmation) !== direction) {
    return empty(
      `The third candle after the inside bar closed against the setup (it must be ${colourWord}).`,
      basePattern,
    );
  }

  const entry = direction === "BUY" ? babyHigh : babyLow;
  const sl = direction === "BUY" ? mother.l : mother.h;
  const risk = Math.abs(entry - sl);

  if (risk <= 0) return empty("Mother candle range is invalid.", basePattern);
  if (risk / price > MAX_RISK_PCT) {
    return empty(
      "The mother candle is too wide; the required stop is larger than acceptable risk.",
      basePattern,
    );
  }

  // The breakout must still be ahead of price; a candle that already ran past
  // the trigger is a chase, not this strategy.
  const triggered = direction === "BUY" ? price > entry : price < entry;
  const overshoot = triggered ? Math.abs(price - entry) / risk : 0;
  if (triggered && overshoot > 0.25) {
    return empty(
      "Price already broke the inside bar and ran away from the entry, so the trade is missed.",
      basePattern,
    );
  }
  const stopGone = direction === "BUY" ? price <= sl : price >= sl;
  if (stopGone) return empty("Price already trades beyond the mother candle stop.", basePattern);

  // Targets: prior swing gives the structural objective, never below 1:3.
  const swingWindow = candles.slice(-60);
  const swingTarget =
    direction === "BUY"
      ? Math.max(...swingWindow.map((c) => c.h))
      : Math.min(...swingWindow.map((c) => c.l));
  const rrTp2 = direction === "BUY" ? entry + risk * IB_MIN_RR : entry - risk * IB_MIN_RR;
  const tp2 =
    direction === "BUY" ? Math.max(rrTp2, swingTarget) : Math.min(rrTp2, swingTarget);
  const tp1 = direction === "BUY" ? entry + risk * 2 : entry - risk * 2;
  const rr = Math.abs(tp2 - entry) / risk;

  if (rr < IB_MIN_RR) {
    return empty("The available reward is below the 1:3 minimum for this strategy.", basePattern);
  }

  reasons.push(
    `Fresh 30m ${freshLow ? "low" : "high"} at ${(freshLow ? mother.l : mother.h).toFixed(decimals)} followed by an inside bar.`,
    `The inside bar colour was ignored; the mother and third candle both closed ${colourWord}.`,
    `Stop sits at the opposite end of the mother candle (${sl.toFixed(decimals)}).`,
    `Reward to structure is ${rr.toFixed(2)}R.`,
  );

  const text = [
    "GOLD 30M MOTHER / INSIDE BAR ENGINE",
    `Live price: ${price.toFixed(decimals)}`,
    `Mother candle: high ${mother.h.toFixed(decimals)} · low ${mother.l.toFixed(decimals)}`,
    `Inside bar: high ${babyHigh.toFixed(decimals)} · low ${babyLow.toFixed(decimals)} · colour not used`,
    `Fresh extreme: ${freshLow ? "new swing LOW" : "new swing HIGH"} versus the previous ${FRESH_LOOKBACK} candles`,
    `Confirmation: mother and third candle ${colourWord}; inside-bar colour irrelevant`,
    `Bars since the last inside bar closed: ${barsSinceBaby}`,
    `Direction: ${direction} on the break of the inside bar`,
    `Entry (stop order): ${round(entry, decimals).toFixed(decimals)}`,
    `Conservative alternative entry: break of the mother candle ${(direction === "BUY" ? mother.h : mother.l).toFixed(decimals)}`,
    `Stop loss: ${round(sl, decimals).toFixed(decimals)} (opposite end of the mother candle)`,
    `TP1 (2R): ${round(tp1, decimals).toFixed(decimals)}`,
    `TP2 (${rr.toFixed(2)}R, prior swing): ${round(tp2, decimals).toFixed(decimals)}`,
    `Risk per unit: ${risk.toFixed(decimals)}`,
    "Invalidation: a 30-minute close beyond the mother candle stop cancels the reversal.",
  ].join("\n");

  const tone = direction === "BUY" ? "buy" : "sell";
  const marks: Array<Record<string, string | number>> = [
    { kind: "zone", from: mother.l, to: mother.h, label: "MOTHER CANDLE", tone },
    { kind: "zone", from: babyLow, to: babyHigh, label: "INSIDE BAR", tone },
    { kind: "line", level: entry, label: `ENTRY ${direction}`, tone },
    { kind: "line", level: sl, label: "STOP LOSS", tone: direction === "BUY" ? "sell" : "buy" },
    { kind: "line", level: tp1, label: "TP1 (2R)", tone },
    { kind: "line", level: tp2, label: `TP2 (${rr.toFixed(1)}R)`, tone },
  ];

  return {
    text,
    direction,
    bias: direction === "BUY" ? "BULLISH" : "BEARISH",
    trade: {
      direction,
      entryType: "STOP",
      entry: round(entry, decimals),
      sl: round(sl, decimals),
      tp: round(tp2, decimals),
      tp1: round(tp1, decimals),
      tp2: round(tp2, decimals),
      rr,
      zone: { kind: "MOTHER", priceLow: mother.l, priceHigh: mother.h },
    },
    senior: { included: true, status: "completed", reasons },
    marks,
    pattern: basePattern,
  };
}
