/** Founding Program offer, shared by the site copy and the trial-length checks. */
export const FOUNDING_MONTHS = 3;
export const FOUNDING_CREDIT_USD = 250;
export const FOUNDING_ID_DAYS = 2;

/** When the founding trial ends, counted from the approval date. */
export function foundingTrialEnd(approvedAt: Date): Date {
  const end = new Date(approvedAt.getTime());
  end.setUTCMonth(end.getUTCMonth() + FOUNDING_MONTHS);
  return end;
}
