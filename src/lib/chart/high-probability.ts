/**
 * High-probability filter for the chart's swing tags and liquidity sweeps.
 * The chart only draws a swing's price-action / sweep tag, or a liquidity
 * sweep, when it passes these checks; weaker readings stay hidden.
 */
import type { SwingPriceAction } from "./swing-price-action";
import type { SwingSweep } from "./swing-sweep";
import type { LiquiditySweep } from "./liquidity-sweeps";
import { LIQ_STRONG_SWEEP } from "./liquidity-sweeps";

/** Reversal pattern printed AND the reversal side controls the swing (✓). */
export function isHighProbabilityPriceAction(pa: SwingPriceAction | undefined | null): boolean {
  return !!pa && pa.reacted;
}

/** Fresh-swing sweep confirmed with a displacement move within 2 candles. */
export function isHighProbabilitySweep(sw: SwingSweep | undefined | null): boolean {
  return !!sw && sw.status === "confirmed";
}

/** Pool sweep that held on the next closed candle and scored as strong. */
export function isHighProbabilityLiquiditySweep(s: LiquiditySweep): boolean {
  return s.confirmed && s.strength >= LIQ_STRONG_SWEEP;
}
