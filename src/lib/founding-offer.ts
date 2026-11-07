import { FOUNDING_API_CREDIT } from "@/lib/plan-pricing";
/** Founding Program offer, shared by the site copy and the trial-length checks. */
/** Plans an applicant can pick; anything else falls back to Pro. */
export const FOUNDING_PLANS = ["pro", "elite"] as const;
export type FoundingPlan = (typeof FOUNDING_PLANS)[number];
export const FOUNDING_PLAN: FoundingPlan = "pro";
export const FOUNDING_MONTHS = 1;
export const FOUNDING_PLAN_DAYS = 30;
/** Founding members get only their plan's API credit (Pro $25, Elite $50), not a separate bonus. */
export function foundingCreditFor(plan: string | null | undefined): number {
  return FOUNDING_API_CREDIT[foundingPlanFor(plan)];
}
/** "$25 (Pro) or $50 (Elite)" for copy that doesn't know the member's plan. */
export const FOUNDING_CREDIT_LABEL = `$${FOUNDING_API_CREDIT.pro} (Pro) or $${FOUNDING_API_CREDIT.elite} (Elite)`;
/** Founding credit ends together with the Founding plan. */
export const FOUNDING_CREDIT_DAYS = 30;
export const FOUNDING_ID_DAYS = 2;
/** Credit from plans, top-ups, the free trial and Founding lasts this long from each grant. */
export const CREDIT_LOT_DAYS = 30;

const DAY = 86400000;

/** The Founding plan granted for a requested tier (Pro or Elite only). */
export function foundingPlanFor(requested: string | null | undefined): FoundingPlan {
  return String(requested || "").toLowerCase() === "elite" ? "elite" : "pro";
}

/** When the founding plan ends, counted from the approval date. */
export function foundingTrialEnd(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + FOUNDING_PLAN_DAYS * DAY);
}

/** When the founding credit expires, counted from the approval date. */
export function foundingCreditEnd(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + FOUNDING_CREDIT_DAYS * DAY);
}

/** Expiry for a credit grant (mirrors the database rule: 30 days for every grant). */
export function creditLotExpiry(grantedAt: Date, _reason: string): Date {
  return new Date(grantedAt.getTime() + CREDIT_LOT_DAYS * DAY);
}
