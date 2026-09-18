import { analyzeTF, buildLiquidityPools, type Candle } from "@/lib/analysis/engine";
import { predict, type HeavySignal } from "@/lib/candle/predict";
import type { Candle as IndicatorCandle } from "@/lib/candle/indicators";

export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export type CandleForecast = {
  direction: "BULLISH" | "BEARISH" | "INDECISIVE";
  confidence: number;
  character: "continuation" | "rejection" | "sweep/reversal" | "range";
  candleClosesAt: string;
  nextCandleStartsAt: string;
  generatedAt: string;
  remainingSeconds: number;
  evidence: string[];
  invalidation: string;
  calibration: { tested: number; accuracy: number; stability: number };
  score: number;
  stale: boolean;
};

export function get15mBoundary(nowMs = Date.now()) {
  const currentOpenMs = Math.floor(nowMs / FIFTEEN_MINUTES_MS) * FIFTEEN_MINUTES_MS;
  const currentCloseMs = currentOpenMs + FIFTEEN_MINUTES_MS;
  return { currentOpenMs, currentCloseMs, remainingMs: Math.max(0, currentCloseMs - nowMs) };
}

function toIndicator(candle: Candle): IndicatorCandle {
  return {
    openTime: candle.t,
    open: candle.o,
    high: candle.h,
    low: candle.l,
    close: candle.c,
    volume: candle.v,
    closeTime: candle.t + FIFTEEN_MINUTES_MS - 1,
  };
}

function topEvidence(signal: HeavySignal, candles: Candle[], hourly: Candle[]): string[] {
  const ltf = analyzeTF(candles);
  const htf = analyzeTF(hourly);
  const pools = buildLiquidityPools(hourly, candles);
  const factorEvidence = signal.factors
    .filter((factor) => Math.sign(factor.value) === Math.sign(signal.score) && Math.abs(factor.value) >= 0.35)
    .sort((a, b) => Math.abs(b.value * b.weight) - Math.abs(a.value * a.weight))
    .slice(0, 3)
    .map((factor) => factor.label);
  const structure = `H1 ${htf.trend}; 15m ${ltf.trend}`;
  const swept = pools.find((pool) => pool.swept);
  return [structure, ...(swept ? [`${swept.label} liquidity swept`] : []), ...factorEvidence].slice(0, 4);
}

export function build15mCandleForecast(
  candles: Candle[],
  hourly: Candle[],
  nowMs = Date.now(),
): CandleForecast {
  const boundary = get15mBoundary(nowMs);
  const closed = candles.filter((candle) => candle.t < boundary.currentOpenMs).slice(-360);
  const closedHourly = hourly.filter((candle) => candle.t < nowMs).slice(-360);
  const generatedAt = new Date(nowMs).toISOString();
  const lastClosed = closed[closed.length - 1];
  const stale = !lastClosed || nowMs - (lastClosed.t + FIFTEEN_MINUTES_MS) > 20 * 60 * 1000;
  const signal = predict(closed.map(toIndicator), closedHourly.map((candle) => ({
    openTime: candle.t,
    open: candle.o,
    high: candle.h,
    low: candle.l,
    close: candle.c,
    volume: candle.v,
    closeTime: candle.t + 60 * 60 * 1000 - 1,
  })));

  if (!signal || stale) {
    return {
      direction: "INDECISIVE",
      confidence: 0,
      character: "range",
      candleClosesAt: new Date(boundary.currentCloseMs).toISOString(),
      nextCandleStartsAt: new Date(boundary.currentCloseMs).toISOString(),
      generatedAt,
      remainingSeconds: Math.ceil(boundary.remainingMs / 1000),
      evidence: [stale ? "15m market data is stale" : "Insufficient closed 15m candle history"],
      invalidation: "Wait for fresh closed-candle data before requesting another forecast.",
      calibration: { tested: 0, accuracy: 0, stability: 0 },
      score: 0,
      stale,
    };
  }

  const calibrated = signal.backtest.highConf.tested >= 12
    ? signal.backtest.highConf
    : signal.backtest;
  const usable =
    signal.advice === "TRADE" &&
    calibrated.tested >= 12 &&
    calibrated.accuracy >= 52 &&
    signal.agreement >= 58 &&
    signal.stability >= 50 &&
    signal.quality !== "LOW";
  const direction = usable
    ? signal.next.direction === "UP"
      ? "BULLISH"
      : "BEARISH"
    : "INDECISIVE";
  const confidence = usable
    ? Math.min(85, Math.max(52, Math.round((signal.next.probability + calibrated.accuracy) / 2)))
    : Math.min(59, Math.max(0, Math.round(signal.next.probability)));
  const recent = closed.slice(-2);
  const last = recent[recent.length - 1];
  const previous = recent[recent.length - 2];
  const lastRange = Math.max((last?.h ?? 0) - (last?.l ?? 0), 1e-9);
  const wickDominant = last
    ? Math.max(last.h - Math.max(last.o, last.c), Math.min(last.o, last.c) - last.l) / lastRange > 0.52
    : false;
  const swept = previous && last ? last.h > previous.h || last.l < previous.l : false;
  const character: CandleForecast["character"] =
    direction === "INDECISIVE"
      ? "range"
      : swept && wickDominant
        ? "sweep/reversal"
        : wickDominant
          ? "rejection"
          : "continuation";

  return {
    direction,
    confidence,
    character,
    candleClosesAt: new Date(boundary.currentCloseMs).toISOString(),
    nextCandleStartsAt: new Date(boundary.currentCloseMs).toISOString(),
    generatedAt,
    remainingSeconds: Math.ceil(boundary.remainingMs / 1000),
    evidence: topEvidence(signal, closed, closedHourly),
    invalidation:
      direction === "INDECISIVE"
        ? "Evidence is weak or conflicting; wait for the current 15m candle to close."
        : `A fresh 15m structure break against the ${direction.toLowerCase()} score invalidates this forecast.`,
    calibration: {
      tested: calibrated.tested,
      accuracy: Math.round(calibrated.accuracy),
      stability: signal.stability,
    },
    score: Number(signal.score.toFixed(3)),
    stale: false,
  };
}

export function formatForecast(forecast: CandleForecast): string {
  const minutes = Math.floor(forecast.remainingSeconds / 60);
  const seconds = String(forecast.remainingSeconds % 60).padStart(2, "0");
  return [
    `NEXT 15M CANDLE: ${forecast.direction}`,
    `MODEL CONFIDENCE: ${forecast.confidence}%`,
    `EXPECTED CHARACTER: ${forecast.character.toUpperCase()}`,
    `CURRENT CANDLE CLOSES: ${forecast.candleClosesAt} (in ${minutes}m ${seconds}s; next candle starts then)`,
    `EVIDENCE: ${forecast.evidence.join(" · ")}`,
    `INVALIDATION: ${forecast.invalidation}`,
  ].join("\n");
}