/**
 * Free trial for new sign-ups (started server-side by `start_signup_trial()` in the
 * database, which must use the same amounts). The trial gives Pro features in the
 * Terminal and API access, never JX Bot (Founding members only).
 */
export const FREE_TRIAL_CREDIT_USD = 30;
export const FREE_TRIAL_DAYS = 14;

/** API requests per minute allowed on a free-trial account (protects the shared model pool). */
export const TRIAL_API_RPM = 30;

/** Error for a free-trial API call over the per-minute limit, or null when it may run. */
export function trialRateBlock(input: { isFreeTrial: boolean; requestsLastMinute: number }): string | null {
  if (!input.isFreeTrial) return null;
  if ((Number(input.requestsLastMinute) || 0) < TRIAL_API_RPM) return null;
  return `Free trial limit: ${TRIAL_API_RPM} requests per minute. Wait a moment and try again, or choose a paid plan for higher limits.`;
}
