import type { PaidPlanId } from "@/lib/plan-features";

/**
 * Plan prices (USD per month). Everyone pays the Terminal + API price; verified Founding
 * members also get JX Bot, so their price adds the bot's cost on top. The server charges
 * from these same numbers, so the page and the payment check never disagree.
 */
export const TERMINAL_API_PRICE: Record<PaidPlanId, number> = { pro: 29, elite: 59, ultra: 99 };
export const JX_BOT_PRICE: Record<PaidPlanId, number> = { pro: 20, elite: 40, ultra: 70 };

export const PAID_PLAN_IDS: PaidPlanId[] = ["pro", "elite", "ultra"];

export function isPaidPlanId(id: unknown): id is PaidPlanId {
  return id === "pro" || id === "elite" || id === "ultra";
}

/** Monthly price of a plan: Terminal + API, plus JX Bot for verified Founding members. */
export function planPrice(plan: PaidPlanId, withBot: boolean): number {
  return TERMINAL_API_PRICE[plan] + (withBot ? JX_BOT_PRICE[plan] : 0);
}

/** Highest plan a payment covers (or null), using the payer's own price list. */
export function planCoveredBy(paidUsd: number, withBot: boolean): PaidPlanId | null {
  let best: PaidPlanId | null = null;
  for (const id of PAID_PLAN_IDS) if (paidUsd + 0.01 >= planPrice(id, withBot)) best = id;
  return best;
}
