/**
 * Chart strategy lock + hourly fee.
 *
 * Fresh sweep, Swing price action and the Zone + FVG (supply / demand)
 * strategy are paid tools. They unlock for paid plans (Pro / Elite / Ultra),
 * approved Founding members and a running free trial (the one started with
 * "Start free"), and only while the wallet still has credit. Each clock hour
 * (UTC) in which any of them is switched on costs STRATEGY_HOURLY_FEE_USD.
 * Admins are never locked or charged.
 */

export const STRATEGY_HOURLY_FEE_USD = 0.1;

/** Chart switches covered by the lock and the hourly fee. */
export const LOCKED_STRATEGY_KEYS = ["swingSweep", "priceAction", "sdStrategy"] as const;

export type StrategyAccessReason = "admin" | "paid" | "founding" | "trial" | "no_plan" | "no_credit";

export type StrategyAccess = {
  allowed: boolean;
  reason: StrategyAccessReason;
};

type Sub = {
  plan_id: string | null;
  status: string | null;
  is_trial: boolean | null;
  current_period_end?: string | null;
  trial_ends_at: string | null;
} | null;

const PAID = ["pro", "elite", "ultra"];

export function evaluateStrategyAccess(input: {
  isAdmin: boolean;
  isFounding: boolean;
  sub: Sub;
  balance: number;
  now?: number;
}): StrategyAccess {
  const now = input.now ?? Date.now();
  if (input.isAdmin) return { allowed: true, reason: "admin" };
  const sub = input.sub;
  const active = (sub?.status || "").toLowerCase() === "active" || (sub?.status || "").toLowerCase() === "trialing";
  const periodOk = !sub?.current_period_end || Date.parse(sub.current_period_end) > now;
  const plan = String(sub?.plan_id || "").toLowerCase();
  const trialEnd = Date.parse(sub?.trial_ends_at || "");
  const trial = active && Boolean(sub?.is_trial) && Number.isFinite(trialEnd) && trialEnd > now;
  const paid = active && periodOk && !sub?.is_trial && PAID.includes(plan);

  let reason: StrategyAccessReason | null = null;
  if (paid) reason = "paid";
  else if (input.isFounding) reason = "founding";
  else if (trial) reason = "trial";
  if (!reason) return { allowed: false, reason: "no_plan" };
  if (!(Number(input.balance) >= STRATEGY_HOURLY_FEE_USD)) return { allowed: false, reason: "no_credit" };
  return { allowed: true, reason };
}

/** The UTC clock hour a charge belongs to, e.g. "2026-10-22T06". One charge per hour. */
export function strategyHourKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 13);
}
