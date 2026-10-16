/**
 * Relative volume (RVOL): each candle's volume divided by the average volume
 * of the previous `period` candles. The current candle is excluded from its
 * own baseline so a spike cannot dilute itself.
 *
 * Gold has no central volume — this is the feed's tick/contract volume, so it
 * is a display-only activity clue and never feeds pressure, zones or signals.
 */
export const RVOL_PERIOD = 20;
export const RVOL_HIGH = 1.5;
export const RVOL_ULTRA = 2.5;

export type RvolLevel = "low" | "normal" | "high" | "ultra";

/** Baseline (average of previous `period` volumes) per bar; NaN until enough history. */
export function volumeBaseline(volumes: number[], period = RVOL_PERIOD): number[] {
  const out = new Array<number>(volumes.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < volumes.length; i++) {
    if (i >= period) {
      out[i] = sum / period;
      sum -= volumes[i - period] || 0;
    }
    sum += volumes[i] || 0;
  }
  return out;
}

export function relativeVolume(volumes: number[], period = RVOL_PERIOD): number[] {
  const base = volumeBaseline(volumes, period);
  return volumes.map((v, i) => (Number.isFinite(base[i]) && base[i] > 0 ? (v || 0) / base[i] : NaN));
}

export function rvolLevel(ratio: number): RvolLevel | null {
  if (!Number.isFinite(ratio)) return null;
  if (ratio >= RVOL_ULTRA) return "ultra";
  if (ratio >= RVOL_HIGH) return "high";
  if (ratio < 0.8) return "low";
  return "normal";
}

export const RVOL_LABEL: Record<RvolLevel, string> = {
  low: "Low",
  normal: "Normal",
  high: "High volume",
  ultra: "Ultra spike",
};

export function formatVolume(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

export type VolumeSide = "buy" | "sell" | "balanced";

/**
 * Estimated buy/sell split of one candle's volume from where it closed inside
 * its range (close-location value): close at the high = all buying, at the low
 * = all selling. The gold feed has no real aggressor (buy/sell) data, so this
 * is an estimate, not exchange order flow.
 */
export function volumeSplit(bar: { high: number; low: number; close: number; volume: number }) {
  const range = bar.high - bar.low;
  const buyShare = range > 0 ? Math.min(1, Math.max(0, (bar.close - bar.low) / range)) : 0.5;
  const v = bar.volume || 0;
  const side: VolumeSide = buyShare >= 0.6 ? "buy" : buyShare <= 0.4 ? "sell" : "balanced";
  return { buy: v * buyShare, sell: v * (1 - buyShare), buyShare, side };
}
