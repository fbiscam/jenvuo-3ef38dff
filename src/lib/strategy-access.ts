/**
 * Chart strategy lock.
 *
 * Fresh sweep, Swing price action and the Zone + FVG (supply / demand) strategy are paid
 * Terminal indicators. Every plan gets them for a number of hours each UTC day
 * (`TERMINAL_DAILY_HOURS` in free-plan.ts: Free 2h, Pro 8h, Elite 16h, Ultra all day);
 * when the day's time is used up they lock and disappear until 00:00 UTC.
 */
import { strategySecondsLeft, strategyTier, type StrategyTier } from "@/lib/free-plan";

/** Chart switches covered by the lock. */
export const LOCKED_STRATEGY_KEYS = ["swingSweep", "priceAction", "sdStrategy"] as const;

export type StrategyAccessReason = "admin" | "paid" | "founding" | "trial" | "free" | "time_used";

export type StrategyAccess = {
  allowed: boolean;
  reason: StrategyAccessReason;
  tier: StrategyTier;
  /** Seconds left today, null when the plan has no daily limit. */
  secondsLeft: number | null;
};

const PLAN_REASONS: StrategyAccessReason[] = ["admin", "paid", "founding", "trial"];

/** Strategies follow the plan decision (checkPlanAccess) and today's used time. */
export function evaluateStrategyAccess(
  terminal: { allowed: boolean; reason: string | null },
  planId: string | null,
  usedSeconds: number,
): StrategyAccess {
  const onPlan = terminal.allowed;
  const tier = strategyTier(onPlan ? terminal.reason : null, planId);
  const secondsLeft = strategySecondsLeft(tier, usedSeconds);
  const base: StrategyAccessReason = onPlan ? (PLAN_REASONS.find((r) => r === terminal.reason) ?? "paid") : "free";
  if (secondsLeft !== null && secondsLeft <= 0) return { allowed: false, reason: "time_used", tier, secondsLeft: 0 };
  return { allowed: true, reason: base, tier, secondsLeft };
}
