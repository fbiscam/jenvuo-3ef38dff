import type { OhlcvBar } from "@/lib/chart/indicators";

export function dailyFeedVolume(bars: readonly Pick<OhlcvBar, "volume">[]) {
  if (bars.length < 5) return null;
  const today = bars[bars.length - 1]?.volume ?? 0;
  const prior = bars.slice(-31, -1).map((bar) => bar.volume).filter((v) => Number.isFinite(v) && v > 0);
  if (!Number.isFinite(today) || today <= 0 || !prior.length) return null;
  const avg = prior.reduce((sum, value) => sum + value, 0) / prior.length;
  return { today, avg };
}