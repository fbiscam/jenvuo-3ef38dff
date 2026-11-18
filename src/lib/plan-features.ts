import { dailyTargetLabel, MT5_PLANS } from "@/lib/mt5-licenses";
import { PLAN_API_CREDIT } from "@/lib/plan-pricing";
import { PLAN_API_KEYS } from "@/lib/free-plan";

export type PaidPlanId = "pro" | "elite" | "ultra";

/** Billing plan bullets. Every paid plan comes with JX Bot. */
export function planFeatures(plan: PaidPlanId, _withBot = true): string[] {
  const ips = MT5_PLANS[plan].licenses;
  return [
    "Terminal paid strategies",
    `JX Bot on ${ips} IP${ips > 1 ? "s" : ""} · ${dailyTargetLabel(plan)} daily target`,
    `$${PLAN_API_CREDIT[plan]} API credit`,
    `${PLAN_API_KEYS[plan]} API keys`,
  ];
}
