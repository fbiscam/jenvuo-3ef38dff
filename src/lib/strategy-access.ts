/**
 * Chart strategy lock.
 *
 * Fresh sweep, Swing price action and the Zone + FVG (supply / demand)
 * strategy are part of Terminal access: they unlock exactly when the Terminal
 * does (approved Founding members and admins) and cost no credits.
 */

/** Chart switches covered by the lock. */
export const LOCKED_STRATEGY_KEYS = ["swingSweep", "priceAction", "sdStrategy"] as const;

export type StrategyAccessReason = "admin" | "paid" | "founding" | "trial" | "no_plan";

export type StrategyAccess = {
  allowed: boolean;
  reason: StrategyAccessReason;
};

const UNLOCK_REASONS: StrategyAccessReason[] = ["admin", "paid", "founding", "trial"];

/** Strategies follow the Terminal access decision exactly. */
export function evaluateStrategyAccess(terminal: { allowed: boolean; reason: string | null }): StrategyAccess {
  if (!terminal.allowed) return { allowed: false, reason: "no_plan" };
  const reason = UNLOCK_REASONS.find((r) => r === terminal.reason) ?? "paid";
  return { allowed: true, reason };
}
