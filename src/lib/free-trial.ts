/**
 * The 14-day Pro free trial is closed for new sign-ups: they start on the Free plan
 * (see free-plan.ts). Trials already running keep going until they end.
 */

import { PLAN_API_RPM } from "./plan-entitlements";

/** API requests per minute allowed on Free (per-plan limits: PLAN_API_RPM in plan-entitlements.ts). */
export const TRIAL_API_RPM = PLAN_API_RPM.free;

/** Error for a Free / free-trial API call over the per-minute limit, or null when it may run. */
export function trialRateBlock(input: { isFreeTrial: boolean; requestsLastMinute: number }): string | null {
  if (!input.isFreeTrial) return null;
  if ((Number(input.requestsLastMinute) || 0) < TRIAL_API_RPM) return null;
  return `Free plan limit: ${TRIAL_API_RPM} requests per minute. Wait a moment and try again, or choose a paid plan for higher limits.`;
}
