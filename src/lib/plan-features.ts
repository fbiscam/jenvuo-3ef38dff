import { dailyTargetLabel, MT5_PLANS } from "@/lib/mt5-licenses";
import { PLAN_API_CREDIT } from "@/lib/plan-pricing";
import { PLAN_API_KEYS } from "@/lib/free-plan";

export type PaidPlanId = "pro" | "elite" | "ultra";

/**
 * Billing plan bullets. JX Bot is listed only when the plan comes with it (one of the month's
 * bot seats, or a bot holder renewing); otherwise the plan is Terminal + API only.
 */
export function planFeatures(plan: PaidPlanId, withBot = true): string[] {
  const ips = MT5_PLANS[plan].licenses;
  return [
    "Terminal paid strategies",
    withBot ? `JX Bot on ${ips} IP${ips > 1 ? "s" : ""} · ${dailyTargetLabel(plan)} daily target` : "No JX Bot: this month's bot seats are full",
    `$${PLAN_API_CREDIT[plan]} API credit`,
    `${PLAN_API_KEYS[plan]} API keys`,
  ];
}
