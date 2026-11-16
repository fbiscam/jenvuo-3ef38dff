/**
 * Free plan and the daily Terminal time for the paid indicators (Fresh sweep, Swing price
 * action, Zone + FVG). The database (`start_signup_trial()` at sign-up and the hourly
 * `process_free_monthly_credit()`) must use the same credit amount.
 */
export const FREE_PLAN_CREDIT_USD = 10;
export const FREE_PLAN_CREDIT_DAYS = 30;
/** Active API keys on Free (DB `plans.extension_key_limit` for `free` must match). */
export const FREE_PLAN_API_KEYS = 1;

export type StrategyTier = "free" | "pro" | "elite" | "ultra" | "unlimited";

/** Hours a day the paid Terminal indicators stay on, per plan (UTC day). 24 = no limit. */
export const TERMINAL_DAILY_HOURS: Record<Exclude<StrategyTier, "unlimited">, number> = {
  free: 2,
  pro: 8,
  elite: 16,
  ultra: 24,
};

/** Plan tier for the Terminal time: admins have no limit, a running trial counts as Pro. */
export function strategyTier(reason: string | null | undefined, planId: string | null | undefined): StrategyTier {
  if (reason === "admin") return "unlimited";
  const plan = String(planId || "").toLowerCase();
  if (reason === "paid" || reason === "founding" || reason === "trial") {
    return plan === "elite" || plan === "ultra" ? plan : "pro";
  }
  return "free";
}

/** Daily limit in seconds, or null when the tier has no limit. */
export function dailyLimitSeconds(tier: StrategyTier): number | null {
  if (tier === "unlimited") return null;
  const hours = TERMINAL_DAILY_HOURS[tier];
  return hours >= 24 ? null : hours * 3600;
}

/** Seconds left today (null = no limit). */
export function strategySecondsLeft(tier: StrategyTier, usedSeconds: number): number | null {
  const limit = dailyLimitSeconds(tier);
  if (limit === null) return null;
  return Math.max(0, limit - Math.max(0, Math.floor(Number(usedSeconds) || 0)));
}
