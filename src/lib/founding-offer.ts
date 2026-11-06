/** Founding Program offer, shared by the site copy and the trial-length checks. */
export const FOUNDING_PLAN = "pro" as const;
export const FOUNDING_MONTHS = 1;
export const FOUNDING_PLAN_DAYS = 30;
export const FOUNDING_CREDIT_USD = 250;
export const FOUNDING_CREDIT_DAYS = 60;
export const FOUNDING_ID_DAYS = 2;
/** Credit from plans, top-ups and the free trial lasts this long from each grant. */
export const CREDIT_LOT_DAYS = 30;

const DAY = 86400000;

/** When the founding Pro plan ends, counted from the approval date. */
export function foundingTrialEnd(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + FOUNDING_PLAN_DAYS * DAY);
}

/** When the founding $250 credit expires, counted from the approval date. */
export function foundingCreditEnd(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + FOUNDING_CREDIT_DAYS * DAY);
}

/** Expiry for a credit grant (mirrors the database rule). */
export function creditLotExpiry(grantedAt: Date, reason: string): Date {
  const days = reason === "founding_trial_grant" ? FOUNDING_CREDIT_DAYS : CREDIT_LOT_DAYS;
  return new Date(grantedAt.getTime() + days * DAY);
}
