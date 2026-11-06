import { DAILY_TARGET_PCT } from "@/lib/mt5-licenses";
import { JX_BOT_PRICE, TERMINAL_API_PRICE } from "@/lib/plan-pricing";

export type PaidPlanId = "pro" | "elite" | "ultra";

const IPS: Record<PaidPlanId, number> = { pro: 1, elite: 2, ultra: 5 };
const WALLET: Record<PaidPlanId, number> = { pro: 10, elite: 25, ultra: 50 };
const API_KEYS: Record<PaidPlanId, number> = { pro: 2, elite: 3, ultra: 5 };

/**
 * Billing plan bullets. JX Bot is offered to verified Founding members only, so they see the
 * bot per plan with its cost; everyone else sees Terminal + API only.
 */
export function planFeatures(plan: PaidPlanId, foundingMember: boolean): string[] {
  if (foundingMember) {
    return [
      `Terminal + API $${TERMINAL_API_PRICE[plan]}`,
      `JX Bot on ${IPS[plan]} IP${IPS[plan] > 1 ? "s" : ""} +$${JX_BOT_PRICE[plan]}`,
      `${DAILY_TARGET_PCT[plan]}% daily auto-stop`,
      `$${WALLET[plan]} API credit`,
    ];
  }
  return ["Terminal paid strategies", `$${WALLET[plan]} API credit`, `${API_KEYS[plan]} API keys`];
}
