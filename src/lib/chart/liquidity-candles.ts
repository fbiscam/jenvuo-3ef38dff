/**
 * Port of the user's "5M XAUUSD Liquidity & Volume Detector" Pine script.
 * Works on every timeframe. A candle is:
 *  - buyer liquidity  (sky blue): volume spike + sweeps the lowest low of the
 *    previous `lookback` candles + (lower wick >= 40% of range OR bullish close)
 *  - seller liquidity (grey): volume spike + sweeps the highest high of the
 *    previous `lookback` candles + (upper wick >= 40% of range OR bearish close)
 * Volume spike = volume > EMA(volume, 20) * 1.5. When the feed has no usable
 * volume (e.g. gold spot), candle range vs EMA(range, 20) is used instead so the
 * result is the same for every account and feed.
 */
export type LiquidityBar = { time: number; open: number; high: number; low: number; close: number; volume?: number };
export type LiquidityKind = "buyer" | "seller";

export const LIQUIDITY_COLORS = { buyer: "#00D2FF", seller: "#808080" } as const;

export function detectLiquidityCandles(
  bars: LiquidityBar[],
  opts: { lookback?: number; emaLength?: number; multiplier?: number; wickRatio?: number; ignoreVolume?: boolean } = {},
): Map<number, LiquidityKind> {
  const lookback = opts.lookback ?? 10;
  const len = opts.emaLength ?? 20;
  const mult = opts.multiplier ?? 1.5;
  const wickRatio = opts.wickRatio ?? 0.4;
  const out = new Map<number, LiquidityKind>();
  if (bars.length <= lookback) return out;

  const withVolume = bars.filter((b) => (b.volume ?? 0) > 0).length;
  const useVolume = !opts.ignoreVolume && withVolume >= bars.length * 0.8;
  const metric = (b: LiquidityBar) => (useVolume ? (b.volume ?? 0) : b.high - b.low);

  const alpha = 2 / (len + 1);
  let ema = metric(bars[0]);
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i];
    const m = metric(b);
    ema = alpha * m + (1 - alpha) * ema;
    if (i < Math.max(lookback, len)) continue;
    const spike = m > ema * mult;
    if (!spike) continue;
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = i - lookback; j < i; j++) {
      lo = Math.min(lo, bars[j].low);
      hi = Math.max(hi, bars[j].high);
    }
    const range = b.high - b.low;
    if (range <= 0) continue;
    const lowerWick = Math.min(b.open, b.close) - b.low;
    const upperWick = b.high - Math.max(b.open, b.close);
    const buyer = b.low < lo && (lowerWick / range >= wickRatio || b.close > b.open);
    const seller = b.high > hi && (upperWick / range >= wickRatio || b.close < b.open);
    if (buyer) out.set(i, "buyer");
    else if (seller) out.set(i, "seller");
  }
  return out;
}
