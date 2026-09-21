import type { StructureCandle } from "./market-structure-evidence";

export type PoiMitigation = "UNMITIGATED" | "PARTIAL" | "MITIGATED";

export type FairValueGap = {
  type: "BULLISH_FVG" | "BEARISH_FVG";
  index: number;
  t: number;
  top: number;
  bottom: number;
  /** Consequent encroachment: 50% of the gap. */
  ce: number;
  size: number;
  status: PoiMitigation;
  mitigated_t: number | null;
};

export type OrderBlockZone = {
  type: "DEMAND" | "SUPPLY";
  index: number;
  t: number;
  top: number;
  bottom: number;
  is_fvg_aligned: boolean;
  swept_liquidity: boolean;
  displacement: boolean;
  status: PoiMitigation;
  mitigated_t: number | null;
};

export type PriceActionSignal = {
  signal_type: "REJECTION_WICK" | "LTF_CHOCH";
  zone_tapped: "DEMAND_OB" | "SUPPLY_OB" | "BULLISH_FVG" | "BEARISH_FVG";
  index: number;
  t: number;
  direction: "bullish" | "bearish";
  entry_price: number;
  stop_loss: number;
  confidence_score: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
};

export type PoiEvidence = {
  fair_value_gaps: FairValueGap[];
  order_blocks: OrderBlockZone[];
  price_action_signals: PriceActionSignal[];
};

function isValid(c: StructureCandle): boolean {
  return (
    Number.isFinite(c.t) &&
    Number.isFinite(c.o) &&
    Number.isFinite(c.h) &&
    Number.isFinite(c.l) &&
    Number.isFinite(c.c) &&
    c.h >= c.l &&
    c.h >= Math.max(c.o, c.c) &&
    c.l <= Math.min(c.o, c.c)
  );
}

function averageRange(candles: StructureCandle[], end: number, len = 14): number {
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

function classifyFill(
  candles: StructureCandle[],
  from: number,
  zone: { top: number; bottom: number },
  bullish: boolean,
): { status: PoiMitigation; mitigated_t: number | null } {
  let status: PoiMitigation = "UNMITIGATED";
  let mitigated_t: number | null = null;
  for (let i = from; i < candles.length; i += 1) {
    const c = candles[i]!;
    const tapped = bullish ? c.l <= zone.top : c.h >= zone.bottom;
    if (!tapped) continue;
    const filled = bullish ? c.l <= zone.bottom : c.h >= zone.top;
    if (filled) return { status: "MITIGATED", mitigated_t: c.t };
    status = "PARTIAL";
    if (mitigated_t == null) mitigated_t = c.t;
  }
  return { status, mitigated_t };
}

/**
 * Deterministic Point-of-Interest evidence: fair value gaps, order blocks and
 * rejection signatures. Every zone is derived from closed candles only; nothing
 * is inferred from a chart image.
 */
export function detectPoiEvidence(candles: StructureCandle[]): PoiEvidence {
  const empty: PoiEvidence = { fair_value_gaps: [], order_blocks: [], price_action_signals: [] };
  if (!Array.isArray(candles) || candles.length < 5) return empty;
  candles.forEach((c, i) => {
    if (!isValid(c)) throw new Error(`Invalid OHLC candle at index ${i}`);
  });

  const fvgs: FairValueGap[] = [];
  for (let i = 2; i < candles.length; i += 1) {
    const a = candles[i - 2]!;
    const c = candles[i]!;
    const atr = averageRange(candles, i);
    if (c.l > a.h) {
      const bottom = a.h;
      const top = c.l;
      const size = top - bottom;
      if (size > atr * 0.05) {
        const fill = classifyFill(candles, i + 1, { top, bottom }, true);
        fvgs.push({
          type: "BULLISH_FVG",
          index: i,
          t: c.t,
          top,
          bottom,
          ce: (top + bottom) / 2,
          size,
          ...fill,
        });
      }
    } else if (c.h < a.l) {
      const top = a.l;
      const bottom = c.h;
      const size = top - bottom;
      if (size > atr * 0.05) {
        const fill = classifyFill(candles, i + 1, { top, bottom }, false);
        fvgs.push({
          type: "BEARISH_FVG",
          index: i,
          t: c.t,
          top,
          bottom,
          ce: (top + bottom) / 2,
          size,
          ...fill,
        });
      }
    }
  }

  const orderBlocks: OrderBlockZone[] = [];
  for (const gap of fvgs) {
    const bullish = gap.type === "BULLISH_FVG";
    // The order block is the last opposite-coloured candle before the impulse
    // leg that created the imbalance.
    let obIndex = -1;
    for (let i = gap.index - 1; i >= Math.max(0, gap.index - 6); i -= 1) {
      const c = candles[i]!;
      const opposite = bullish ? c.c < c.o : c.c > c.o;
      if (opposite) {
        obIndex = i;
        break;
      }
    }
    if (obIndex < 0) continue;
    const ob = candles[obIndex]!;
    const atr = averageRange(candles, gap.index);
    const impulse = candles[gap.index - 1]!;
    const displacement = atr > 0 && Math.abs(impulse.c - impulse.o) >= atr * 0.6;

    const lookback = candles.slice(Math.max(0, obIndex - 10), obIndex);
    const swept = lookback.length
      ? bullish
        ? ob.l < Math.min(...lookback.map((c) => c.l))
        : ob.h > Math.max(...lookback.map((c) => c.h))
      : false;

    const zone = { top: ob.h, bottom: ob.l };
    const fill = classifyFill(candles, gap.index + 1, zone, bullish);
    const duplicate = orderBlocks.some((z) => z.index === obIndex);
    if (duplicate) continue;
    orderBlocks.push({
      type: bullish ? "DEMAND" : "SUPPLY",
      index: obIndex,
      t: ob.t,
      top: zone.top,
      bottom: zone.bottom,
      is_fvg_aligned: true,
      swept_liquidity: swept,
      displacement,
      ...fill,
    });
  }

  const signals: PriceActionSignal[] = [];
  const pushSignal = (
    zoneKind: PriceActionSignal["zone_tapped"],
    zone: { top: number; bottom: number; index: number },
    bullish: boolean,
    startIndex: number,
    strong: boolean,
  ) => {
    for (let i = startIndex; i < candles.length; i += 1) {
      const c = candles[i]!;
      const body = Math.abs(c.c - c.o);
      const tapped = bullish ? c.l <= zone.top && c.l >= zone.bottom : c.h >= zone.bottom && c.h <= zone.top;
      if (!tapped) continue;
      const wick = bullish ? Math.min(c.o, c.c) - c.l : c.h - Math.max(c.o, c.c);
      const closedBack = bullish ? c.c > zone.top : c.c < zone.bottom;
      if (!closedBack || wick <= body) continue;
      const buffer = Math.max((zone.top - zone.bottom) * 0.1, averageRange(candles, i) * 0.1);
      signals.push({
        signal_type: "REJECTION_WICK",
        zone_tapped: zoneKind,
        index: i,
        t: c.t,
        direction: bullish ? "bullish" : "bearish",
        entry_price: bullish ? zone.top : zone.bottom,
        stop_loss: bullish ? zone.bottom - buffer : zone.top + buffer,
        confidence_score: strong ? "HIGH" : "MEDIUM",
        detail: `Rejection wick into ${zoneKind} ${zone.bottom.toFixed(2)}–${zone.top.toFixed(2)} with a close back ${bullish ? "above" : "below"} the zone.`,
      });
      break;
    }
  };

  for (const ob of orderBlocks) {
    const bullish = ob.type === "DEMAND";
    pushSignal(
      bullish ? "DEMAND_OB" : "SUPPLY_OB",
      { top: ob.top, bottom: ob.bottom, index: ob.index },
      bullish,
      ob.index + 1,
      ob.is_fvg_aligned && ob.swept_liquidity && ob.displacement,
    );
  }
  for (const gap of fvgs) {
    if (gap.status === "MITIGATED") continue;
    const bullish = gap.type === "BULLISH_FVG";
    pushSignal(
      bullish ? "BULLISH_FVG" : "BEARISH_FVG",
      { top: gap.top, bottom: gap.bottom, index: gap.index },
      bullish,
      gap.index + 1,
      false,
    );
  }

  signals.sort((a, b) => a.index - b.index);
  return { fair_value_gaps: fvgs, order_blocks: orderBlocks, price_action_signals: signals };
}
