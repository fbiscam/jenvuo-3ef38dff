import type { PaidPlanId } from "@/lib/plan-features";
import { PLAN_PRICE_NO_BOT, PLAN_PRICE_WITH_BOT } from "@/lib/bot-seats";

/**
 * Plan prices (USD per month), one set for everyone, JX Bot included in every paid plan.
 * The server charges from these same numbers, so the page and the payment check never disagree.
 */
export const TERMINAL_API_PRICE: Record<PaidPlanId, number> = PLAN_PRICE_WITH_BOT;
export const TERMINAL_API_PRICE_NO_BOT: Record<PaidPlanId, number> = PLAN_PRICE_NO_BOT;

export const PAID_PLAN_IDS: PaidPlanId[] = ["pro", "elite", "ultra"];

export function isPaidPlanId(id: unknown): id is PaidPlanId {
  return id === "pro" || id === "elite" || id === "ultra";
}

/** Monthly price of a plan, with JX Bot (default) or without it. */
export function planPrice(plan: PaidPlanId, withBot = true): number {
  return (withBot ? PLAN_PRICE_WITH_BOT : PLAN_PRICE_NO_BOT)[plan];
}

/**
 * API credit a plan payment adds (USD), with or without JX Bot. The rest of the price pays for
 * the Terminal (and JX Bot when included), so it is never added to the wallet.
 */
export const PLAN_API_CREDIT: Record<PaidPlanId, number> = { pro: 40, elite: 70, ultra: 90 };

/** API credit Founding members get for their Founding month (Pro or Elite). */
export const FOUNDING_API_CREDIT: Record<"pro" | "elite", number> = { pro: PLAN_API_CREDIT.pro, elite: PLAN_API_CREDIT.elite };

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
export function planCoveredBy(paidUsd: number, withBot = true): PaidPlanId | null {
  let best: PaidPlanId | null = null;
  for (const id of PAID_PLAN_IDS) if (paidUsd + 0.01 >= planPrice(id, withBot)) best = id;
  return best;
}

/**
 * Whether a plan order's payment covers that plan. A discount promo (stored as the order's
 * bonus) counts toward the price; anything else must be paid in full: an underpaid plan order
 * must never start the plan or add its API credit.
 */
export function planOrderCovers(args: { planId: string | null | undefined; payUsd: number; discountUsd?: number; withBot?: boolean }): boolean {
  if (!isPaidPlanId(args.planId)) return false;
  const paid = Math.max(0, Number(args.payUsd) || 0) + Math.max(0, Number(args.discountUsd) || 0);
  return paid + 0.01 >= planPrice(args.planId, args.withBot ?? true);
}

/** Length of one paid plan period bought on the Payments page. */
export const PLAN_PERIOD_DAYS = 30;

/**
 * End of the paid period an approved plan order starts. Paying again for the same plan adds
 * 30 days on top of the time left; a new or switched plan runs 30 days from the payment.
 * Without an end date the hourly expiry job never moves the account back to Free.
 */
export function paidPeriodEnd(args: { samePlan: boolean; currentEnd: string | null | undefined; now?: number }): string {
  const now = args.now ?? Date.now();
  const end = args.currentEnd ? Date.parse(args.currentEnd) : NaN;
  const from = args.samePlan && Number.isFinite(end) && end > now ? end : now;
  return new Date(from + PLAN_PERIOD_DAYS * 86_400_000).toISOString();
}

/** Yearly billing discount, percent off twelve monthly payments. */
export const ANNUAL_DISCOUNT_PCT = 22;

/**
 * Which billing basis the account's plan is actually billed on.
 * The Payments page only ever charges the monthly price, so a paid plan is always monthly;
 * Free costs nothing on either basis. The pricing page marks "Current plan" only on the basis
 * the account really sits on, so the yearly column never shows a second current-plan chip.
 */
export function currentPlanBasis(planId: string | null | undefined): "monthly" | "annual" | "both" {
  if (!planId || planId === "free") return "both";
  return isPaidPlanId(planId) ? "monthly" : "both";
}

/** The pricing page opens on yearly so the discounted price is the first one shown. */
export const DEFAULT_BILLING_CYCLE = "annual" as const;

/** Full price of twelve months, before the yearly discount. */
export function annualFullPrice(plan: PaidPlanId): number {
  return planPrice(plan) * 12;
}

/** Yearly price after the discount, rounded down to whole dollars. */
export function annualPrice(plan: PaidPlanId): number {
  return Math.floor((annualFullPrice(plan) * (100 - ANNUAL_DISCOUNT_PCT)) / 100 + 1e-9);
}
