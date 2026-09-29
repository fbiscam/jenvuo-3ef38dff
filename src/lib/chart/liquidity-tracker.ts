import { detectMarketStructureEvidence } from "@/lib/analysis/market-structure-evidence";
import { detectPoiEvidence } from "@/lib/analysis/poi-evidence";
import type { OhlcvBar } from "./indicators";

export type LiquidityDirection = "bullish" | "bearish";

export type SessionLiquidityLevel = {
  kind: "ASIA_HIGH" | "ASIA_LOW" | "LONDON_HIGH" | "LONDON_LOW";
  price: number;
  dayStart: number;
};

export type LiquiditySweep = {
  t: number;
  level: SessionLiquidityLevel["kind"];
  levelPrice: number;
  direction: LiquidityDirection;
  wickRatio: number;
  volumeRatio: number | null;
  volumeConfirmed: boolean;
  htfConfluence: boolean;
  mssConfirmed: boolean;
  holdConfirmed: boolean;
  highProbability: boolean;
  session: "London" | "New York";
};

export type LiquidityTracker = {
  sessionState: "Asia range building" | "Asia range locked" | "London opening window" | "New York opening window" | "Outside execution windows";
  htfAlignment: "Bullish" | "Bearish" | "Undecided";
  volumeSpikeRatio: number | null;
  volumeAvailable: boolean;
  levels: SessionLiquidityLevel[];
  sweeps: LiquiditySweep[];
};

export type LiquidityProjector = {
  x: (timeSeconds: number) => number | null;
  y: (price: number) => number | null;
  width: number;
  height: number;
};

type CompactCandle = { t: number; o: number; h: number; l: number; c: number };

const HOUR = 3600;
const DAY = 24 * HOUR;

const dayStartUtc = (time: number) => Math.floor(time / DAY) * DAY;

function aggregateHourly(bars: OhlcvBar[]): OhlcvBar[] {
  const grouped = new Map<number, OhlcvBar[]>();
  for (const bar of bars) {
    const bucket = Math.floor(bar.time / HOUR) * HOUR;
    const group = grouped.get(bucket);
    if (group) group.push(bar);
    else grouped.set(bucket, [bar]);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([, group]) => group.length === 4)
    .map(([time, group]) => ({
      time,
      open: group[0].open,
      high: Math.max(...group.map((bar) => bar.high)),
      low: Math.min(...group.map((bar) => bar.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, bar) => sum + bar.volume, 0),
    }));
}

function averageTrueRange(bars: OhlcvBar[], end: number, length = 14): number {
  let total = 0;
  let count = 0;
  for (let index = Math.max(1, end - length + 1); index <= end; index += 1) {
    const bar = bars[index];
    const previous = bars[index - 1];
    if (!bar || !previous) continue;
    total += Math.max(bar.high - bar.low, Math.abs(bar.high - previous.close), Math.abs(bar.low - previous.close));
    count += 1;
  }
  return count ? total / count : 0;
}

function sessionStateAt(time: number): LiquidityTracker["sessionState"] {
  const hour = (time - dayStartUtc(time)) / HOUR;
  if (hour < 6) return "Asia range building";
  if (hour >= 7 && hour < 9) return "London opening window";
  if (hour >= 12 && hour < 14) return "New York opening window";
  if (hour >= 6 && hour < 7) return "Asia range locked";
  return "Outside execution windows";
}

function toCompact(bars: OhlcvBar[]): CompactCandle[] {
  return bars.map((bar) => ({ t: bar.time * 1000, o: bar.open, h: bar.high, l: bar.low, c: bar.close }));
}

/**
 * Deterministic 15M Gold session-liquidity tracker. `bars` must contain only
 * server-fed closed candles; no forming candle participates in a signal.
 */
export function computeLiquidityTracker(
  bars: OhlcvBar[],
  options: { volumeReliable?: boolean } = {},
): LiquidityTracker | null {
  if (bars.length < 40) return null;
  const ordered = [...bars].sort((a, b) => a.time - b.time);
  const hourly = aggregateHourly(ordered);
  const hourlyCompact = toCompact(hourly);
  const htfStructure = detectMarketStructureEvidence(hourlyCompact, 2);
  const htfPoi = detectPoiEvidence(hourlyCompact);
  const htfAlignment: LiquidityTracker["htfAlignment"] =
    htfStructure.trend === "bullish" ? "Bullish" : htfStructure.trend === "bearish" ? "Bearish" : "Undecided";
  const htfPrices = [
    ...htfStructure.pivots.map((pivot) => pivot.price),
    ...htfPoi.order_blocks.flatMap((zone) => [zone.top, zone.bottom]),
  ];

  const levels: SessionLiquidityLevel[] = [];
  const days = [...new Set(ordered.map((bar) => dayStartUtc(bar.time)))];
  for (const dayStart of days) {
    const asia = ordered.filter((bar) => bar.time >= dayStart && bar.time < dayStart + 6 * HOUR);
    if (asia.length === 24) {
      levels.push({ kind: "ASIA_HIGH", price: Math.max(...asia.map((bar) => bar.high)), dayStart });
      levels.push({ kind: "ASIA_LOW", price: Math.min(...asia.map((bar) => bar.low)), dayStart });
    }
    const london = ordered.filter((bar) => bar.time >= dayStart + 7 * HOUR && bar.time < dayStart + 9 * HOUR);
    if (london.length === 8) {
      levels.push({ kind: "LONDON_HIGH", price: Math.max(...london.map((bar) => bar.high)), dayStart });
      levels.push({ kind: "LONDON_LOW", price: Math.min(...london.map((bar) => bar.low)), dayStart });
    }
  }

  const volumeAvailable = options.volumeReliable === true && ordered.some((bar) => bar.volume > 0);
  const sweeps: LiquiditySweep[] = [];
  for (let index = 20; index < ordered.length; index += 1) {
    const candle = ordered[index];
    const dayStart = dayStartUtc(candle.time);
    const hour = (candle.time - dayStart) / HOUR;
    const session = hour >= 7 && hour < 9 ? "London" : hour >= 12 && hour < 14 ? "New York" : null;
    if (!session) continue;
    const targets = levels.filter((level) => {
      if (level.dayStart !== dayStart) return false;
      return session === "London" ? level.kind.startsWith("ASIA") : true;
    });
    const range = candle.high - candle.low;
    if (!(range > 0)) continue;
    const averageVolume = ordered.slice(index - 20, index).reduce((sum, bar) => sum + bar.volume, 0) / 20;
    const volumeRatio = volumeAvailable && averageVolume > 0 ? candle.volume / averageVolume : null;
    for (const level of targets) {
      const highTarget = level.kind.endsWith("HIGH");
      const swept = highTarget
        ? candle.high > level.price && candle.close < level.price
        : candle.low < level.price && candle.close > level.price;
      if (!swept) continue;
      const wick = highTarget ? candle.high - Math.max(candle.open, candle.close) : Math.min(candle.open, candle.close) - candle.low;
      const wickRatio = wick / range;
      if (wickRatio < 0.5) continue;
      const direction: LiquidityDirection = highTarget ? "bearish" : "bullish";
      const atr = averageTrueRange(ordered, index);
      const tolerance = Math.max(atr * 0.15, level.price * 0.00005);
      const htfConfluence = htfPrices.some((price) => Math.abs(price - level.price) <= tolerance);

      const previous = ordered.slice(Math.max(0, index - 8), index);
      const opposingLevel = direction === "bullish"
        ? Math.max(...previous.map((bar) => bar.high))
        : Math.min(...previous.map((bar) => bar.low));
      const confirmation = ordered.slice(index + 1, index + 4);
      const holdConfirmed = confirmation.length > 0 && (direction === "bullish"
        ? confirmation[0].close > level.price && confirmation[0].low >= level.price - tolerance
        : confirmation[0].close < level.price && confirmation[0].high <= level.price + tolerance);
      const mssConfirmed = confirmation.some((bar) => direction === "bullish" ? bar.close > opposingLevel : bar.close < opposingLevel);
      const volumeConfirmed = volumeRatio != null && volumeRatio >= 1.5;
      sweeps.push({
        t: candle.time * 1000,
        level: level.kind,
        levelPrice: level.price,
        direction,
        wickRatio,
        volumeRatio,
        volumeConfirmed,
        htfConfluence,
        mssConfirmed,
        holdConfirmed,
        highProbability: htfConfluence && volumeConfirmed && holdConfirmed && mssConfirmed,
        session,
      });
    }
  }

  const latest = ordered[ordered.length - 1];
  const latestVolumeAverage = ordered.slice(-21, -1).reduce((sum, bar) => sum + bar.volume, 0) / 20;
  return {
    sessionState: sessionStateAt(latest.time + 15 * 60),
    htfAlignment,
    volumeSpikeRatio: volumeAvailable && latestVolumeAverage > 0 ? latest.volume / latestVolumeAverage : null,
    volumeAvailable,
    levels: levels.filter((level) => level.dayStart === dayStartUtc(latest.time)).slice(-4),
    sweeps: sweeps.slice(-12),
  };
}

export function renderLiquidityTracker(
  context: CanvasRenderingContext2D,
  tracker: LiquidityTracker,
  projector: LiquidityProjector,
): void {
  context.save();
  context.font = "700 10px 'JetBrains Mono', ui-monospace, monospace";
  for (const level of tracker.levels) {
    const y = projector.y(level.price);
    const start = projector.x((level.dayStart + (level.kind.startsWith("ASIA") ? 6 : 9) * HOUR));
    if (y == null || start == null) continue;
    const label = level.kind.replace("_", " ");
    context.strokeStyle = level.kind.startsWith("ASIA") ? "#2563eb" : "#d97706";
    context.fillStyle = context.strokeStyle;
    context.lineWidth = 1.25;
    context.setLineDash([3, 4]);
    context.beginPath();
    context.moveTo(Math.max(0, start), y);
    context.lineTo(projector.width, y);
    context.stroke();
    context.setLineDash([]);
    context.fillText(`${label} ${level.price.toFixed(2)}`, Math.max(4, Math.min(projector.width - 130, start + 5)), y - 5);
  }
  for (const sweep of tracker.sweeps) {
    if (!sweep.highProbability) continue;
    const x = projector.x(sweep.t / 1000);
    const y = projector.y(sweep.levelPrice);
    if (x == null || y == null || x < 0 || x > projector.width) continue;
    const label = "🔥 15M Institutional Sweep";
    context.font = "700 11px 'JetBrains Mono', ui-monospace, monospace";
    const width = context.measureText(label).width + 18;
    const left = Math.max(3, Math.min(projector.width - width - 3, x - width / 2));
    const top = Math.max(4, Math.min(projector.height - 26, sweep.direction === "bullish" ? y + 12 : y - 34));
    context.shadowColor = sweep.direction === "bullish" ? "#10b981" : "#ef4444";
    context.shadowBlur = 12;
    context.fillStyle = sweep.direction === "bullish" ? "#047857" : "#b91c1c";
    context.beginPath();
    context.roundRect?.(left, top, width, 24, 4);
    if (!context.roundRect) context.rect(left, top, width, 24);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#ffffff";
    context.fillText(label, left + 9, top + 16);
  }
  context.restore();
}