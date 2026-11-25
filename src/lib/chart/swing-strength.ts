/**
 * Weak vs Strong fresh high/low — trade-management hint.
 * Strong (exit / take profit): a high-probability reversal printed at the swing
 * (pin/sweep can confirm on the swing candle itself; engulfing on the next candle).
 * Weak (hold): the reaction candles closed with no strong price action and no
 * confirmed sweep, so the opposite side likely keeps pushing.
 * Display only; never creates Entry/SL/TP.
 */
import type { SwingPriceAction } from "./swing-price-action";
import type { SwingSweep } from "./swing-sweep";
import { isHighProbabilityPriceAction, isHighProbabilitySweep } from "./high-probability";

export type SwingStrength = "strong" | "weak" | "pending";

export function classifySwingStrength(
  pa: SwingPriceAction | undefined | null,
  sweep: SwingSweep | undefined | null,
): { strength: SwingStrength; text: string } {
  if (isHighProbabilityPriceAction(pa) || isHighProbabilitySweep(sweep)) {
    return { strength: "strong", text: "Strong · Exit" };
  }
  const sweepOpen = sweep?.status === "pending";
  if (pa?.settled && !sweepOpen) return { strength: "weak", text: "Weak · Hold" };
  return { strength: "pending", text: "" };
}
