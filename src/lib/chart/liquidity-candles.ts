/**
 * Liquidity sweep candles, every timeframe, closed candles only.
 *
 * 1. Every swing high/low is found with a fast 3-bar fractal (3 candles on each
 *    side), so fresh highs/lows become liquidity levels quickly; older ones stay
 *    in the pool until they are taken.
 * 2. A candle "grabs liquidity" when its wick trades beyond an untaken level but
 *    the candle CLOSES back inside it:
 *      - wick below a swing low, close above it  -> buyer liquidity
 *      - wick above a swing high, close below it -> seller liquidity
 * 3. A level is removed once swept or once a candle body closes through it, so
 *    each level can only produce one liquidity candle.
 * Pure price logic (no feed-specific volume), so every account sees the same.
 */
export type LiquidityBar = { time: number; open: number; high: number; low: number; close: number; volume?: number };
export type LiquidityKind = "buyer" | "seller";

export const LIQUIDITY_MARKER_COLORS = { buyer: "#16A34A", seller: "#DC2626" } as const;

type Level = { price: number; index: number };

export function detectLiquidityCandles(
  bars: LiquidityBar[],
  opts: { strength?: number; maxAge?: number } = {},
): Map<number, LiquidityKind> {
  const k = opts.strength ?? 3;
  const maxAge = opts.maxAge ?? 300;
  const out = new Map<number, LiquidityKind>();
  const highs: Level[] = [];
  const lows: Level[] = [];

  for (let i = 0; i < bars.length; i++) {
    // A pivot at p = i - k is confirmed once k candles closed after it.
    const p = i - k;
    if (p >= k) {
      let isHigh = true;
      let isLow = true;
      for (let j = p - k; j <= p + k; j++) {
        if (j === p) continue;
        if (bars[j].high >= bars[p].high) isHigh = false;
        if (bars[j].low <= bars[p].low) isLow = false;
      }
      // Only add if no candle after the pivot already took it.
      if (isHigh) highs.push({ price: bars[p].high, index: p });
      if (isLow) lows.push({ price: bars[p].low, index: p });
    }

    const b = bars[i];
    let buyer = false;
    let seller = false;
    for (let n = lows.length - 1; n >= 0; n--) {
      const lv = lows[n];
      if (lv.index >= i || i - lv.index > maxAge) {
        if (i - lv.index > maxAge) lows.splice(n, 1);
        continue;
      }
      if (b.low < lv.price) {
        if (b.close > lv.price) buyer = true;
        lows.splice(n, 1);
      }
    }
    for (let n = highs.length - 1; n >= 0; n--) {
      const lv = highs[n];
      if (lv.index >= i || i - lv.index > maxAge) {
        if (i - lv.index > maxAge) highs.splice(n, 1);
        continue;
      }
      if (b.high > lv.price) {
        if (b.close < lv.price) seller = true;
        highs.splice(n, 1);
      }
    }
    if (buyer && !seller) out.set(i, "buyer");
    else if (seller && !buyer) out.set(i, "seller");
    else if (buyer && seller) {
      const range = b.high - b.low || 1;
      const lower = Math.min(b.open, b.close) - b.low;
      const upper = b.high - Math.max(b.open, b.close);
      out.set(i, lower / range >= upper / range ? "buyer" : "seller");
    }
  }
  return out;
}
