/**
 * Chart strategy lock.
 *
 * Fresh sweep, Swing price action and the Zone + FVG (supply / demand)
 * strategy are paid Terminal features: the Terminal is open to everyone, but
 * these unlock only with a paid plan, the Pro trial, Founding or admin, and
 * cost no credits.
 */

/** Chart switches covered by the lock. */
export const LOCKED_STRATEGY_KEYS = ["swingSweep", "priceAction", "sdStrategy"] as const;

export type StrategyAccessReason = "admin" | "paid" | "founding" | "trial" | "no_plan";

export type StrategyAccess = {
  allowed: boolean;
  reason: StrategyAccessReason;
};

const UNLOCK_REASONS: StrategyAccessReason[] = ["admin", "paid", "founding", "trial"];

/** Strategies follow the plan decision (checkPlanAccess). */
export function evaluateStrategyAccess(terminal: { allowed: boolean; reason: string | null }): StrategyAccess {
  if (!terminal.allowed) return { allowed: false, reason: "no_plan" };
  const reason = UNLOCK_REASONS.find((r) => r === terminal.reason) ?? "paid";
  return { allowed: true, reason };
}
