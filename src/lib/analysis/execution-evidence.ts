import {
  detectMarketStructureEvidence,
  type ActiveLiquidityPool,
  type AdvancedSmcBar,
  type MarketStructureCandle,
  type StructurePivot,
} from "./market-structure-evidence";
import type { OrderBlockZone, PoiEvidence } from "./poi-evidence";

export type TradingSession =
  | "ASIAN_RANGE"
  | "LONDON_OPEN"
  | "NY_OPEN"
  | "LONDON_CLOSE"
  | "OFF_HOURS";
export type JudasSwing = "BULLISH_JUDAS_SWING" | "BEARISH_JUDAS_SWING";
export type BreakerType = "BULLISH_BREAKER_BLOCK" | "BEARISH_BREAKER_BLOCK";

export type BreakerBlock = {
  type: BreakerType;
  top: number;
  bottom: number;
  source_index: number;
  break_index: number;
  status: "UNMITIGATED" | "PARTIAL" | "MITIGATED";
};

export type ExecutionSignal = {
  direction: "BUY" | "SELL";
  trigger_type: "BREAKER_BLOCK_RETEST" | "OTE_FVG_ALIGNMENT" | "JUDAS_SWING";
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  risk_reward_ratio: number;
  confluence_score: string;
};

export type ExecutionEvidence = {
  system_status: "READY_TO_EXECUTE" | "WAITING_FOR_KILLZONE" | "NO_SETUP";
  current_session: TradingSession;
  trade_allowed: boolean;
  new_york_time: string;
  asian_range: { high: number; low: number; trading_date: string } | null;
  amd_phase: "ACCUMULATION" | "MANIPULATION" | "DISTRIBUTION" | "NONE";
  judas_swing: JudasSwing | null;
  breakers: BreakerBlock[];
  ote: {
    direction: "BUY" | "SELL";
    level_618: number;
    level_705: number;
    level_790: number;
    zone_top: number;
    zone_bottom: number;
    price_inside: boolean;
  } | null;
  trade_signal: ExecutionSignal | null;
};

type NyParts = { year: number; month: number; day: number; hour: number; minute: number };

const nyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function nyParts(timestamp: number): NyParts {
  const values = Object.fromEntries(
    nyFormatter
      .formatToParts(new Date(timestamp))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
  };
}

function dateKey(parts: NyParts, addDays = 0): string {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + addDays));
  return date.toISOString().slice(0, 10);
}

export function classifyNewYorkSession(timestamp: number): {
  session: TradingSession;
  tradeAllowed: boolean;
  localTime: string;
} {
  const p = nyParts(timestamp);
  const decimalHour = p.hour + p.minute / 60;
  const session: TradingSession =
    decimalHour >= 20
      ? "ASIAN_RANGE"
      : decimalHour >= 2 && decimalHour < 5
        ? "LONDON_OPEN"
        : decimalHour >= 7 && decimalHour < 10
          ? "NY_OPEN"
          : decimalHour >= 10 && decimalHour <= 12
            ? "LONDON_CLOSE"
            : "OFF_HOURS";
  return {
    session,
    tradeAllowed: decimalHour >= 2 && decimalHour <= 12,
    localTime: `${dateKey(p)} ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")} America/New_York`,
  };
}

function averageRange(candles: MarketStructureCandle[], end: number, length = 14): number {
  const sample = candles.slice(Math.max(0, end - length + 1), end + 1);
  return sample.length
    ? sample.reduce((sum, candle) => sum + candle.high - candle.low, 0) / sample.length
    : 0;
}

function strongBody(candles: MarketStructureCandle[], index: number): boolean {
  const candle = candles[index];
  if (!candle) return false;
  const atr = averageRange(candles, index);
  return atr > 0 && Math.abs(candle.close - candle.open) >= atr * 0.6;
}

function breakerStatus(
  candles: MarketStructureCandle[],
  from: number,
  top: number,
  bottom: number,
  bullish: boolean,
): BreakerBlock["status"] {
  let status: BreakerBlock["status"] = "UNMITIGATED";
  for (let i = from; i < candles.length; i += 1) {
    const candle = candles[i];
    if (!candle) continue;
    const touches = candle.low <= top && candle.high >= bottom;
    if (!touches) continue;
    status = "PARTIAL";
    if (bullish ? candle.close < bottom : candle.close > top) return "MITIGATED";
  }
  return status;
}

function findPreviousPivot(
  pivots: StructurePivot[],
  kind: "high" | "low",
  beforeIndex: number,
): StructurePivot | null {
  return (
    [...pivots].reverse().find((pivot) => pivot.kind === kind && pivot.index < beforeIndex) ?? null
  );
}

export function detectBreakerBlocks(
  candles: MarketStructureCandle[],
  orderBlocks: OrderBlockZone[],
): BreakerBlock[] {
  const structure = detectMarketStructureEvidence(
    candles.map((candle) => ({
      t: candle.timestamp,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
    })),
  );
  const breakers: BreakerBlock[] = [];

  for (const ob of orderBlocks) {
    if (!ob.is_fvg_aligned || !ob.displacement) continue;
    const bullish = ob.type === "SUPPLY";
    const sweptPivot = findPreviousPivot(structure.pivots, bullish ? "high" : "low", ob.index);
    const brokenPivot = findPreviousPivot(structure.pivots, bullish ? "low" : "high", ob.index);
    if (!sweptPivot || !brokenPivot) continue;

    let sweptAt = -1;
    let structuralBreakAt = -1;
    let convertedAt = -1;
    for (let i = ob.index; i < candles.length; i += 1) {
      const candle = candles[i];
      if (!candle) continue;
      const swept = bullish
        ? candle.high > sweptPivot.price && candle.close <= sweptPivot.price
        : candle.low < sweptPivot.price && candle.close >= sweptPivot.price;
      if (sweptAt < 0 && swept) sweptAt = i;
      if (sweptAt >= 0 && structuralBreakAt < 0) {
        const brokeStructure = bullish
          ? candle.close < brokenPivot.price
          : candle.close > brokenPivot.price;
        if (brokeStructure && strongBody(candles, i)) structuralBreakAt = i;
      }
      if (structuralBreakAt >= 0) {
        const brokeBlock = bullish ? candle.close > ob.top : candle.close < ob.bottom;
        if (brokeBlock && strongBody(candles, i)) {
          convertedAt = i;
          break;
        }
      }
    }
    if (convertedAt < 0) continue;
    breakers.push({
      type: bullish ? "BULLISH_BREAKER_BLOCK" : "BEARISH_BREAKER_BLOCK",
      top: ob.top,
      bottom: ob.bottom,
      source_index: ob.index,
      break_index: convertedAt,
      status: breakerStatus(candles, convertedAt + 1, ob.top, ob.bottom, bullish),
    });
  }
  return breakers;
}

function currentAsianRange(candles: MarketStructureCandle[], now: NyParts) {
  const tradingDate = dateKey(now);
  const bars = candles.filter((candle) => {
    const p = nyParts(candle.timestamp);
    return p.hour >= 20 && dateKey(p, 1) === tradingDate;
  });
  if (!bars.length) return null;
  return {
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    trading_date: tradingDate,
  };
}

function detectJudas(
  candles: MarketStructureCandle[],
  range: { high: number; low: number; trading_date: string } | null,
): JudasSwing | null {
  if (!range) return null;
  const london = candles.filter((candle) => {
    const p = nyParts(candle.timestamp);
    return dateKey(p) === range.trading_date && p.hour >= 2 && p.hour < 5;
  });
  let result: JudasSwing | null = null;
  for (const candle of london) {
    if (candle.high > range.high && candle.close <= range.high && candle.close >= range.low) {
      result = "BEARISH_JUDAS_SWING";
    } else if (
      candle.low < range.low &&
      candle.close >= range.low &&
      candle.close <= range.high
    ) {
      result = "BULLISH_JUDAS_SWING";
    }
  }
  return result;
}

function latestPair(pivots: StructurePivot[], direction: "BUY" | "SELL") {
  const highLabels = direction === "BUY" ? ["HH"] : ["LH", "HH"];
  const lowLabels = direction === "BUY" ? ["HL", "LL"] : ["LL"];
  const high = [...pivots].reverse().find((pivot) => highLabels.includes(pivot.label));
  const low = [...pivots].reverse().find((pivot) => lowLabels.includes(pivot.label));
  return high && low && high.price > low.price ? { high: high.price, low: low.price } : null;
}

function nearestTarget(
  pools: ActiveLiquidityPool[],
  direction: "BUY" | "SELL",
  entry: number,
  fallback: number,
): number {
  const levels = pools
    .filter(
      (pool) =>
        pool.status === "UNSWEPT" &&
        (direction === "BUY" ? pool.price_level > entry : pool.price_level < entry),
    )
    .map((pool) => pool.price_level)
    .sort((a, b) => (direction === "BUY" ? a - b : b - a));
  return levels[0] ?? fallback;
}

export function buildExecutionEvidence(
  candles: MarketStructureCandle[],
  advancedBars: AdvancedSmcBar[],
  poi: PoiEvidence,
): ExecutionEvidence {
  const latest = candles.at(-1);
  const state = advancedBars.at(-1);
  if (!latest || !state) {
    return {
      system_status: "NO_SETUP",
      current_session: "OFF_HOURS",
      trade_allowed: false,
      new_york_time: "unavailable",
      asian_range: null,
      amd_phase: "NONE",
      judas_swing: null,
      breakers: [],
      ote: null,
      trade_signal: null,
    };
  }

  const session = classifyNewYorkSession(latest.timestamp);
  const range = currentAsianRange(candles, nyParts(latest.timestamp));
  const judas = detectJudas(candles, range);
  const breakers = detectBreakerBlocks(candles, poi.order_blocks);
  const structure = detectMarketStructureEvidence(
    candles.map((candle) => ({
      t: candle.timestamp,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
    })),
  );
  const direction: "BUY" | "SELL" | null =
    judas === "BULLISH_JUDAS_SWING"
      ? "BUY"
      : judas === "BEARISH_JUDAS_SWING"
        ? "SELL"
        : state.trend_state === "BULLISH"
          ? "BUY"
          : state.trend_state === "BEARISH"
            ? "SELL"
            : null;
  const pair = direction ? latestPair(structure.pivots, direction) : null;
  const ote = (() => {
    if (!direction || !pair) return null;
    const size = pair.high - pair.low;
    const level618 = direction === "BUY" ? pair.high - size * 0.618 : pair.low + size * 0.618;
    const level705 = direction === "BUY" ? pair.high - size * 0.705 : pair.low + size * 0.705;
    const level790 = direction === "BUY" ? pair.high - size * 0.79 : pair.low + size * 0.79;
    const zoneTop = Math.max(level618, level790);
    const zoneBottom = Math.min(level618, level790);
    return {
      direction,
      level_618: level618,
      level_705: level705,
      level_790: level790,
      zone_top: zoneTop,
      zone_bottom: zoneBottom,
      price_inside: latest.close >= zoneBottom && latest.close <= zoneTop,
    };
  })();

  const activeBreaker = direction
    ? [...breakers]
        .reverse()
        .find(
          (breaker) =>
            breaker.status !== "MITIGATED" &&
            breaker.type ===
              (direction === "BUY" ? "BULLISH_BREAKER_BLOCK" : "BEARISH_BREAKER_BLOCK"),
        )
    : null;
  const activeFvg = direction
    ? [...poi.fair_value_gaps]
        .reverse()
        .find(
          (gap) =>
            gap.status !== "MITIGATED" &&
            gap.type === (direction === "BUY" ? "BULLISH_FVG" : "BEARISH_FVG"),
        )
    : null;
  const poiZone = activeBreaker ?? activeFvg;
  const overlapsOte = Boolean(
    ote && poiZone && poiZone.bottom <= ote.zone_top && poiZone.top >= ote.zone_bottom,
  );
  const entry = ote && poiZone ? Math.max(ote.zone_bottom, Math.min(ote.level_705, ote.zone_top)) : 0;
  const stop =
    direction && poiZone
      ? direction === "BUY"
        ? poiZone.bottom - 1.5
        : poiZone.top + 1.5
      : 0;
  const risk = Math.abs(entry - stop);
  const tp2 = direction === "BUY" ? entry + risk * 3 : entry - risk * 3;
  const external = pair ? (direction === "BUY" ? pair.high : pair.low) : 0;
  const tp1 = direction
    ? nearestTarget(state.active_liquidity_pools, direction, entry, range?.[direction === "BUY" ? "high" : "low"] ?? external)
    : 0;
  const setupReady = Boolean(
    direction &&
      ote?.price_inside &&
      overlapsOte &&
      poiZone &&
      risk > 0 &&
      session.tradeAllowed &&
      session.session !== "OFF_HOURS",
  );
  const trigger: ExecutionSignal["trigger_type"] = activeBreaker
    ? "BREAKER_BLOCK_RETEST"
    : judas
      ? "JUDAS_SWING"
      : "OTE_FVG_ALIGNMENT";
  const tradeSignal: ExecutionSignal | null =
    setupReady && direction && pair
      ? {
          direction,
          trigger_type: trigger,
          entry_price: entry,
          stop_loss: stop,
          take_profit_1: tp1,
          take_profit_2: tp2,
          take_profit_3: external,
          risk_reward_ratio: 3,
          confluence_score: activeBreaker && judas ? "10/10" : "8/10",
        }
      : null;
  const phase =
    session.session === "ASIAN_RANGE"
      ? "ACCUMULATION"
      : session.session === "LONDON_OPEN" && judas
        ? "MANIPULATION"
        : session.session === "NY_OPEN" && judas
          ? "DISTRIBUTION"
          : "NONE";

  return {
    system_status: tradeSignal
      ? "READY_TO_EXECUTE"
      : !session.tradeAllowed
        ? "WAITING_FOR_KILLZONE"
        : "NO_SETUP",
    current_session: session.session,
    trade_allowed: session.tradeAllowed,
    new_york_time: session.localTime,
    asian_range: range,
    amd_phase: phase,
    judas_swing: judas,
    breakers,
    ote,
    trade_signal: tradeSignal,
  };
}