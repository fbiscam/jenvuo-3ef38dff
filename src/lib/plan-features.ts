import { PLAN_API_CREDIT } from "@/lib/plan-pricing";
import { PLAN_API_KEYS } from "@/lib/free-plan";

export type PaidPlanId = "pro" | "elite" | "ultra";

/** Billing plan bullets (JX Bot is discontinued). */
export function planFeatures(plan: PaidPlanId, _withBot = true): string[] {
  return [
    "Terminal paid strategies",
    "News",
    `$${PLAN_API_CREDIT[plan]} API credit`,
    `${PLAN_API_KEYS[plan]} API keys`,
  ];
}
