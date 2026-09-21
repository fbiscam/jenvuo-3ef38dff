export type StructureCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

export type StructurePivot = {
  index: number;
  confirmedIndex: number;
  t: number;
  price: number;
  kind: "high" | "low";
  label: "H" | "L" | "HH" | "HL" | "LH" | "LL";
};

export type StructureBreak = {
  index: number;
  t: number;
  type: "BOS" | "CHOCH" | "MSS";
  dir: "bullish" | "bearish";
  level: number;
  displacement: boolean;
};

export type InducementEvidence = {
  kind: "buy-side" | "sell-side";
  price: number;
  t: number;
  swept: boolean;
};

export type MarketStructureEvidence = {
  pivots: StructurePivot[];
  breaks: StructureBreak[];
  trend: "bullish" | "bearish" | "transitioning" | "undecided";
  inducement: InducementEvidence | null;
};

export type MarketStructureCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type MappedMarketStructureCandle = MarketStructureCandle & {
  is_swing_high: boolean;
  is_swing_low: boolean;
  structure_label: "HH" | "HL" | "LH" | "LL" | null;
  smc_event: "BOS" | "CHoCH" | null;
};

export type AdvancedTrendState = "BULLISH" | "BEARISH" | "SIDEWAYS";
export type DealingZone = "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM";
export type AdvancedSmcEvent = "BOS" | "CHoCH" | "BSL_SWEEP" | "SSL_SWEEP" | "IDM_SWEEP";
export type LiquidityPoolType = "BSL" | "SSL" | "EQH" | "EQL" | "IDM";

export type ActiveLiquidityPool = {
  type: LiquidityPoolType;
  price_level: number;
  status: "UNSWEPT" | "SWEPT";
};

export type AdvancedSmcBar = MarketStructureCandle & {
  trend_state: AdvancedTrendState;
  dealing_zone: DealingZone;
  active_liquidity_pools: ActiveLiquidityPool[];
  trendline_liquidity: Array<{
    side: "BSL" | "SSL";
    price_level: number;
    status: "UNSWEPT" | "SWEPT";
  }>;
  equilibrium: number | null;
  last_event: AdvancedSmcEvent | null;
};

export type MultiTimeframeTrend = {
  state: AdvancedTrendState;
  aligned: boolean;
  bullish: string[];
  bearish: string[];
  sideways: string[];
};

function trueRange(current: StructureCandle, previous?: StructureCandle): number {
  if (!previous) return current.h - current.l;
  return Math.max(
    current.h - current.l,
    Math.abs(current.h - previous.c),
    Math.abs(current.l - previous.c),
  );
}

function atrAt(candles: StructureCandle[], index: number, period = 14): number {
  const start = Math.max(0, index - period + 1);
  const ranges = candles
    .slice(start, index + 1)
    .map((candle, offset) => trueRange(candle, candles[start + offset - 1]));
  return ranges.length ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length : 0;
}

/**
 * Produces confirmed, causal market-structure evidence from closed candles.
 * A two-sided pivot becomes available only after two later candles close.
 */
export function detectMarketStructureEvidence(
  input: StructureCandle[],
  radius = 2,
): MarketStructureEvidence {
  const candles = input.filter(
    (c) =>
      Number.isFinite(c.t) &&
      Number.isFinite(c.o) &&
      Number.isFinite(c.h) &&
      Number.isFinite(c.l) &&
      Number.isFinite(c.c) &&
      c.h >= Math.max(c.o, c.c) &&
      c.l <= Math.min(c.o, c.c),
  );
  if (candles.length < radius * 2 + 1) {
    return { pivots: [], breaks: [], trend: "undecided", inducement: null };
  }

  const raw: Array<Omit<StructurePivot, "label">> = [];
  for (let i = radius; i < candles.length - radius; i++) {
    const candle = candles[i];
    const left = candles.slice(i - radius, i);
    const right = candles.slice(i + 1, i + radius + 1);
    const isHigh =
      left.every((item) => candle.h > item.h) && right.every((item) => candle.h > item.h);
    const isLow =
      left.every((item) => candle.l < item.l) && right.every((item) => candle.l < item.l);
    if (isHigh) {
      raw.push({
        index: i,
        confirmedIndex: i + radius,
        t: candle.t,
        price: candle.h,
        kind: "high",
      });
    }
    if (isLow) {
      raw.push({ index: i, confirmedIndex: i + radius, t: candle.t, price: candle.l, kind: "low" });
    }
  }
  raw.sort((a, b) => a.index - b.index || (a.kind === "high" ? -1 : 1));

  let previousHigh: StructurePivot | null = null;
  let previousLow: StructurePivot | null = null;
  const pivots: StructurePivot[] = raw.map((pivot) => {
    const label =
      pivot.kind === "high"
        ? previousHigh
          ? pivot.price > previousHigh.price
            ? "HH"
            : "LH"
          : "H"
        : previousLow
          ? pivot.price < previousLow.price
            ? "LL"
            : "HL"
          : "L";
    const labelled: StructurePivot = { ...pivot, label };
    if (pivot.kind === "high") previousHigh = labelled;
    else previousLow = labelled;
    return labelled;
  });

  const breaks: StructureBreak[] = [];
  let activeHigh: StructurePivot | null = null;
  let activeLow: StructurePivot | null = null;
  let brokenHighIndex = -1;
  let brokenLowIndex = -1;
  let trend: "bullish" | "bearish" | "undecided" = "undecided";
  let cursor = 0;

  for (let i = 0; i < candles.length; i++) {
    while (cursor < pivots.length && pivots[cursor].confirmedIndex <= i) {
      const pivot = pivots[cursor];
      if (pivot.kind === "high") activeHigh = pivot;
      else activeLow = pivot;
      cursor += 1;
    }

    const candle = candles[i];
    const atr = atrAt(candles, i);
    const body = Math.abs(candle.c - candle.o);
    const displacement = atr > 0 && body >= atr * 0.6;
    const closeBuffer = atr * 0.03;
    const bullishBreak =
      activeHigh &&
      activeHigh.index !== brokenHighIndex &&
      candle.c > activeHigh.price + closeBuffer;
    const bearishBreak =
      activeLow && activeLow.index !== brokenLowIndex && candle.c < activeLow.price - closeBuffer;

    if (bullishBreak && activeHigh) {
      const type = trend === "bearish" ? "CHOCH" : trend === "bullish" ? "BOS" : "MSS";
      breaks.push({
        index: i,
        t: candle.t,
        type,
        dir: "bullish",
        level: activeHigh.price,
        displacement,
      });
      brokenHighIndex = activeHigh.index;
      trend = "bullish";
    } else if (bearishBreak && activeLow) {
      const type = trend === "bullish" ? "CHOCH" : trend === "bearish" ? "BOS" : "MSS";
      breaks.push({
        index: i,
        t: candle.t,
        type,
        dir: "bearish",
        level: activeLow.price,
        displacement,
      });
      brokenLowIndex = activeLow.index;
      trend = "bearish";
    }
  }

  const lastBreak = breaks.at(-1) ?? null;
  let inducement: InducementEvidence | null = null;
  if (lastBreak) {
    const brokenPivot = [...pivots]
      .reverse()
      .find(
        (pivot) =>
          pivot.kind === (lastBreak.dir === "bullish" ? "high" : "low") &&
          pivot.price === lastBreak.level &&
          pivot.confirmedIndex <= lastBreak.index,
      );
    const wantedKind = lastBreak.dir === "bullish" ? "low" : "high";
    const candidate = [...pivots]
      .reverse()
      .find(
        (pivot) =>
          pivot.kind === wantedKind &&
          pivot.confirmedIndex < lastBreak.index &&
          (!brokenPivot || pivot.index > brokenPivot.index),
      );
    if (candidate) {
      const afterBreak = candles.slice(lastBreak.index + 1);
      inducement = {
        kind: wantedKind === "low" ? "sell-side" : "buy-side",
        price: candidate.price,
        t: candidate.t,
        swept:
          wantedKind === "low"
            ? afterBreak.some((candle) => candle.l < candidate.price)
            : afterBreak.some((candle) => candle.h > candidate.price),
      };
    }
  }

  const recentDirections = breaks.slice(-2).map((event) => event.dir);
  const finalTrend =
    recentDirections.length === 2 && recentDirections[0] !== recentDirections[1]
      ? "transitioning"
      : trend;
  return { pivots, breaks, trend: finalTrend, inducement };
}

/**
 * Maps confirmed market structure back onto the supplied OHLC candles.
 *
 * This function is causal when called with closed candles: a swing at index N
 * is not emitted until `radius` candles after N are present, and BOS/CHoCH is
 * emitted only on the candle whose close breaks an already-confirmed swing.
 * The first directional break establishes trend and is exposed as BOS; a later
 * opposite break is exposed as CHoCH.
 */
export function mapMarketStructure(
  input: MarketStructureCandle[],
  radius = 2,
): MappedMarketStructureCandle[] {
  if (!Number.isInteger(radius) || radius < 1) {
    throw new RangeError("Market-structure radius must be a positive integer");
  }

  const candles: StructureCandle[] = input.map((candle, index) => {
    const values = [candle.timestamp, candle.open, candle.high, candle.low, candle.close];
    if (
      values.some((value) => !Number.isFinite(value)) ||
      candle.high < Math.max(candle.open, candle.close) ||
      candle.low > Math.min(candle.open, candle.close)
    ) {
      throw new TypeError(`Invalid OHLC candle at index ${index}`);
    }
    return {
      t: candle.timestamp,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
    };
  });

  const evidence = detectMarketStructureEvidence(candles, radius);
  const mapped: MappedMarketStructureCandle[] = input.map((candle) => ({
    ...candle,
    is_swing_high: false,
    is_swing_low: false,
    structure_label: null,
    smc_event: null,
  }));

  for (const pivot of evidence.pivots) {
    const candle = mapped[pivot.index];
    if (!candle) continue;
    if (pivot.kind === "high") candle.is_swing_high = true;
    else candle.is_swing_low = true;
    candle.structure_label =
      pivot.label === "HH" || pivot.label === "HL" || pivot.label === "LH" || pivot.label === "LL"
        ? pivot.label
        : null;
  }

  for (const event of evidence.breaks) {
    const candle = mapped[event.index];
    if (!candle) continue;
    candle.smc_event = event.type === "CHOCH" ? "CHoCH" : "BOS";
  }

  return mapped;
}

type InternalPool = ActiveLiquidityPool & {
  sourceIndex: number;
  side: "high" | "low";
};

function samePool(a: InternalPool, b: InternalPool, tolerance: number): boolean {
  return a.type === b.type && Math.abs(a.price_level - b.price_level) <= tolerance;
}

/**
 * Builds causal SMC state for every closed bar. The XAU/USD defaults use a
 * 0.30 equal-high/low tolerance and a 0.15 trendline alignment tolerance.
 */
export function mapAdvancedSmcState(
  input: MarketStructureCandle[],
  options: { radius?: number; equalTolerance?: number; trendlineTolerance?: number } = {},
): AdvancedSmcBar[] {
  const radius = options.radius ?? 2;
  const equalTolerance = options.equalTolerance ?? 0.3;
  const trendlineTolerance = options.trendlineTolerance ?? 0.15;
  if (equalTolerance < 0 || trendlineTolerance < 0) {
    throw new RangeError("Liquidity tolerances cannot be negative");
  }

  const mapped = mapMarketStructure(input, radius);
  const candles: StructureCandle[] = input.map((candle) => ({
    t: candle.timestamp,
    o: candle.open,
    h: candle.high,
    l: candle.low,
    c: candle.close,
  }));
  const evidence = detectMarketStructureEvidence(candles, radius);
  const confirmations = new Map<number, StructurePivot[]>();
  for (const pivot of evidence.pivots) {
    const atIndex = confirmations.get(pivot.confirmedIndex) ?? [];
    atIndex.push(pivot);
    confirmations.set(pivot.confirmedIndex, atIndex);
  }

  let trend: AdvancedTrendState = "SIDEWAYS";
  let lastEvent: AdvancedSmcEvent | null = null;
  let activeHigh: StructurePivot | null = null;
  let activeLow: StructurePivot | null = null;
  let lastBullishExternal: StructurePivot | null = null;
  let lastBullishInternal: StructurePivot | null = null;
  let lastBearishExternal: StructurePivot | null = null;
  let lastBearishInternal: StructurePivot | null = null;
  let waitingBullishIdmAfter = -1;
  let waitingBearishIdmAfter = -1;
  const confirmedHighs: StructurePivot[] = [];
  const confirmedLows: StructurePivot[] = [];
  const pools: InternalPool[] = [];
  const trendlinePools: InternalPool[] = [];
  const consumedBreaks = new Set<number>();

  const addPool = (pool: InternalPool) => {
    if (!pools.some((existing) => samePool(existing, pool, equalTolerance / 3))) pools.push(pool);
  };

  return mapped.map((bar, index): AdvancedSmcBar => {
    for (const pivot of confirmations.get(index) ?? []) {
      if (pivot.kind === "high") {
        activeHigh = pivot;
        const equal = [...confirmedHighs]
          .reverse()
          .find((previous) => Math.abs(previous.price - pivot.price) <= equalTolerance);
        addPool({
          type: equal ? "EQH" : "BSL",
          price_level: equal ? (equal.price + pivot.price) / 2 : pivot.price,
          status: "UNSWEPT",
          sourceIndex: pivot.index,
          side: "high",
        });
        confirmedHighs.push(pivot);
        if (trend === "BEARISH" && pivot.index > waitingBearishIdmAfter) {
          addPool({
            type: "IDM",
            price_level: pivot.price,
            status: "UNSWEPT",
            sourceIndex: pivot.index,
            side: "high",
          });
          lastBearishInternal = pivot;
          waitingBearishIdmAfter = Number.POSITIVE_INFINITY;
        }
      } else {
        activeLow = pivot;
        const equal = [...confirmedLows]
          .reverse()
          .find((previous) => Math.abs(previous.price - pivot.price) <= equalTolerance);
        addPool({
          type: equal ? "EQL" : "SSL",
          price_level: equal ? (equal.price + pivot.price) / 2 : pivot.price,
          status: "UNSWEPT",
          sourceIndex: pivot.index,
          side: "low",
        });
        confirmedLows.push(pivot);
        if (trend === "BULLISH" && pivot.index > waitingBullishIdmAfter) {
          addPool({
            type: "IDM",
            price_level: pivot.price,
            status: "UNSWEPT",
            sourceIndex: pivot.index,
            side: "low",
          });
          lastBullishInternal = pivot;
          waitingBullishIdmAfter = Number.POSITIVE_INFINITY;
        }
      }
    }

    const previousTrend = trend;
    const bullishCloseBreak =
      activeHigh && !consumedBreaks.has(activeHigh.index) && bar.close > activeHigh.price;
    const bearishCloseBreak =
      activeLow && !consumedBreaks.has(activeLow.index) && bar.close < activeLow.price;

    if (bullishCloseBreak && activeHigh) {
      lastEvent = previousTrend === "BEARISH" ? "CHoCH" : "BOS";
      trend = "BULLISH";
      lastBullishExternal = activeHigh;
      waitingBullishIdmAfter = activeHigh.index;
      consumedBreaks.add(activeHigh.index);
    } else if (bearishCloseBreak && activeLow) {
      lastEvent = previousTrend === "BULLISH" ? "CHoCH" : "BOS";
      trend = "BEARISH";
      lastBearishExternal = activeLow;
      waitingBearishIdmAfter = activeLow.index;
      consumedBreaks.add(activeLow.index);
    } else if (
      activeHigh &&
      !consumedBreaks.has(activeHigh.index) &&
      bar.high > activeHigh.price &&
      bar.close <= activeHigh.price
    ) {
      lastEvent = "BSL_SWEEP";
      consumedBreaks.add(activeHigh.index);
    } else if (
      activeLow &&
      !consumedBreaks.has(activeLow.index) &&
      bar.low < activeLow.price &&
      bar.close >= activeLow.price
    ) {
      lastEvent = "SSL_SWEEP";
      consumedBreaks.add(activeLow.index);
    }

    for (const pool of pools) {
      if (pool.status === "SWEPT" || index <= pool.sourceIndex) continue;
      const swept =
        pool.side === "high" ? bar.high > pool.price_level : bar.low < pool.price_level;
      if (!swept) continue;
      pool.status = "SWEPT";
      if (pool.type === "IDM") lastEvent = "IDM_SWEEP";
    }

    const recentLows = confirmedLows.slice(-3);
    if (
      recentLows.length === 3 &&
      recentLows[0].price < recentLows[1].price &&
      recentLows[1].price < recentLows[2].price
    ) {
      const firstSlope = recentLows[1].price - recentLows[0].price;
      const secondSlope = recentLows[2].price - recentLows[1].price;
      if (Math.abs(firstSlope - secondSlope) <= trendlineTolerance) {
        const candidate: InternalPool = {
          type: "SSL",
          price_level: recentLows[2].price,
          status: "UNSWEPT",
          sourceIndex: recentLows[2].index,
          side: "low",
        };
        if (!trendlinePools.some((pool) => samePool(pool, candidate, trendlineTolerance))) {
          trendlinePools.push(candidate);
        }
      }
    }
    const recentHighs = confirmedHighs.slice(-3);
    if (
      recentHighs.length === 3 &&
      recentHighs[0].price > recentHighs[1].price &&
      recentHighs[1].price > recentHighs[2].price
    ) {
      const firstSlope = recentHighs[0].price - recentHighs[1].price;
      const secondSlope = recentHighs[1].price - recentHighs[2].price;
      if (Math.abs(firstSlope - secondSlope) <= trendlineTolerance) {
        const candidate: InternalPool = {
          type: "BSL",
          price_level: recentHighs[2].price,
          status: "UNSWEPT",
          sourceIndex: recentHighs[2].index,
          side: "high",
        };
        if (!trendlinePools.some((pool) => samePool(pool, candidate, trendlineTolerance))) {
          trendlinePools.push(candidate);
        }
      }
    }
    for (const pool of trendlinePools) {
      if (pool.status === "SWEPT" || index <= pool.sourceIndex) continue;
      if (pool.side === "high" ? bar.high > pool.price_level : bar.low < pool.price_level) {
        pool.status = "SWEPT";
      }
    }

    const rangeHigh = trend === "BULLISH" ? lastBullishExternal?.price : lastBearishInternal?.price;
    const rangeLow = trend === "BULLISH" ? lastBullishInternal?.price : lastBearishExternal?.price;
    const equilibrium =
      rangeHigh != null && rangeLow != null ? (rangeHigh + rangeLow) / 2 : null;
    const dealingZone: DealingZone =
      equilibrium == null
        ? "EQUILIBRIUM"
        : Math.abs(bar.close - equilibrium) <= 0.01
          ? "EQUILIBRIUM"
          : bar.close > equilibrium
            ? "PREMIUM"
            : "DISCOUNT";

    return {
      ...input[index],
      trend_state: trend,
      dealing_zone: dealingZone,
      active_liquidity_pools: pools.map(({ type, price_level, status }) => ({
        type,
        price_level,
        status,
      })),
      trendline_liquidity: trendlinePools.map(({ side, price_level, status }) => ({
        side: side === "high" ? "BSL" : "SSL",
        price_level,
        status,
      })),
      equilibrium,
      last_event: lastEvent,
    };
  });
}

export function classifyMultiTimeframeTrend(
  frames: Record<string, AdvancedSmcBar[]>,
): MultiTimeframeTrend {
  const bullish: string[] = [];
  const bearish: string[] = [];
  const sideways: string[] = [];
  for (const [timeframe, bars] of Object.entries(frames)) {
    const state = bars.at(-1)?.trend_state ?? "SIDEWAYS";
    if (state === "BULLISH") bullish.push(timeframe);
    else if (state === "BEARISH") bearish.push(timeframe);
    else sideways.push(timeframe);
  }
  const directionalCount = bullish.length + bearish.length;
  const state: AdvancedTrendState =
    bullish.length > bearish.length
      ? "BULLISH"
      : bearish.length > bullish.length
        ? "BEARISH"
        : "SIDEWAYS";
  return {
    state,
    aligned: directionalCount >= 2 && (bullish.length === directionalCount || bearish.length === directionalCount),
    bullish,
    bearish,
    sideways,
  };
}
