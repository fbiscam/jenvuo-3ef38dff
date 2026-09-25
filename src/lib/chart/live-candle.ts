import type { OhlcvBar } from "./indicators";

const finiteBar = (bar: OhlcvBar) =>
  Number.isFinite(bar.time) &&
  Number.isFinite(bar.open) &&
  Number.isFinite(bar.high) &&
  Number.isFinite(bar.low) &&
  Number.isFinite(bar.close) &&
  bar.time > 0 &&
  bar.high >= Math.max(bar.open, bar.close) &&
  bar.low <= Math.min(bar.open, bar.close);

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * Rejects malformed bars and a provider-scale live quote before either can
 * stretch the price scale into the full-height candles shown in the report.
 */
export function buildLiveBars(rawBars: OhlcvBar[], livePrice: number | null, liveBucket: number): OhlcvBar[] {
  const bars = rawBars.filter(finiteBar).sort((a, b) => a.time - b.time);
  const unique = bars.filter((bar, index) => index === bars.length - 1 || bar.time !== bars[index + 1].time);
  const last = unique.at(-1);
  if (!last || livePrice == null || !Number.isFinite(livePrice) || livePrice <= 0) return unique;

  const ranges = unique.slice(-24).map((bar) => bar.high - bar.low).filter((range) => range > 0);
  const normalRange = median(ranges);
  const maxMove = Math.max(normalRange * 12, Math.abs(last.close) * 0.03, 1);
  if (Math.abs(livePrice - last.close) > maxMove) return unique;

  if (last.time < liveBucket) {
    return [...unique, {
      time: liveBucket,
      open: livePrice,
      high: livePrice,
      low: livePrice,
      close: livePrice,
      volume: 0,
    }];
  }

  const next = [...unique];
  next[next.length - 1] = {
    ...last,
    close: livePrice,
    high: Math.max(last.high, livePrice),
    low: Math.min(last.low, livePrice),
  };
  return next;
}