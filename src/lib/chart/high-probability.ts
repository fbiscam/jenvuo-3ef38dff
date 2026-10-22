/**
 * High-probability filter for the chart's swing tags and liquidity sweeps.
 * The chart only draws a swing's price-action / sweep tag, or a liquidity
 * sweep, when it passes these checks; weaker readings stay hidden.
 */
import type { SwingPriceAction } from "./swing-price-action";
import type { SwingSweep } from "./swing-sweep";
import type { LiquiditySweep } from "./liquidity-sweeps";
import { LIQ_STRONG_SWEEP } from "./liquidity-sweeps";

/** Strict cut for drawn liquidity sweeps (above the "strong" grade) to drop fakeouts. */
export const LIQ_HIGH_CONFIDENCE = Math.max(LIQ_STRONG_SWEEP, 80);

/** Reversal side must hold at least this share of control for a drawn price-action mark. */
export const PA_MIN_REVERSAL_SHARE = 60;

/**
 * Reversal pattern printed, the reversal side clearly controls the swing (≥60%),
 * the move held, and every reaction candle has closed (verdict can't flip later).
 */
export function isHighProbabilityPriceAction(pa: SwingPriceAction | undefined | null): boolean {
  return (
    !!pa &&
    pa.reacted &&
    pa.held === true &&
    pa.settled === true &&
    pa.pattern !== "indecision" &&
    pa.control !== "balanced" &&
    (pa.reversalShare ?? 0) >= PA_MIN_REVERSAL_SHARE
  );
}

/** Strong fresh-swing sweep confirmed within 2 candles that stayed rejected for the whole window. */
export function isHighProbabilitySweep(sw: SwingSweep | undefined | null): boolean {
  return !!sw && sw.status === "confirmed" && sw.strong === true && sw.held === true;
}

/** Pool sweep that held on the next closed candle and scored as strong. */
export function isHighProbabilityLiquiditySweep(s: LiquiditySweep): boolean {
  return s.confirmed && s.strength >= LIQ_HIGH_CONFIDENCE;
}
