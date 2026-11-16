import type { PaidPlanId } from "@/lib/plan-features";

/**
 * Plan prices (USD per month). One price for everyone: Terminal, API credit and JX Bot are all
 * included in the plan. The server charges from these same numbers, so the page and the
 * payment check never disagree.
 */
export const TERMINAL_API_PRICE: Record<PaidPlanId, number> = { pro: 29, elite: 59, ultra: 99 };

export const PAID_PLAN_IDS: PaidPlanId[] = ["pro", "elite", "ultra"];

export function isPaidPlanId(id: unknown): id is PaidPlanId {
  return id === "pro" || id === "elite" || id === "ultra";
}

/** Monthly price of a plan (JX Bot included for everyone). `_withBot` is kept for old callers. */
export function planPrice(plan: PaidPlanId, _withBot = false): number {
  return TERMINAL_API_PRICE[plan];
}

/**
 * API credit a plan payment adds (USD). The rest of the price pays for the Terminal and
 * JX Bot access, so it is never added to the wallet.
 */
export const PLAN_API_CREDIT: Record<PaidPlanId, number> = { pro: 25, elite: 59, ultra: 99 };

/** API credit Founding members get for their Founding month (Pro or Elite). */
export const FOUNDING_API_CREDIT: Record<"pro" | "elite", number> = { pro: 25, elite: 50 };

/**
 * Credit to add when an order is approved. Credit top-ups add what was bought. A plan
 * payment adds only the plan's API credit, minus what switching plans already added.
 */
export function orderCreditToAdd(args: {
  planId: string | null | undefined;
  topupCreditUsd: number;
  gainedFromPlanSwitch?: number;
}): number {
  if (!isPaidPlanId(args.planId)) return Math.max(0, Math.round(args.topupCreditUsd * 100) / 100);
  const gained = Math.max(0, args.gainedFromPlanSwitch ?? 0);
  return Math.max(0, Math.round((PLAN_API_CREDIT[args.planId] - gained) * 100) / 100);
}

/** Highest plan a payment covers (or null). */
export function planCoveredBy(paidUsd: number, _withBot = false): PaidPlanId | null {
  let best: PaidPlanId | null = null;
  for (const id of PAID_PLAN_IDS) if (paidUsd + 0.01 >= planPrice(id)) best = id;
  return best;
}
