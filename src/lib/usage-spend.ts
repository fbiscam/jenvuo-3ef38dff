/**
 * Credit removals that are NOT usage: unused credit expiring, a trial ending,
 * or a plan change/cancel taking the plan's credit back. They lower the
 * balance but must never be shown as AI spend on Usage charts.
 */
export const NON_USAGE_DEDUCTION_REASONS = new Set([
  "expired",
  "trial_expired",
  "plan_change",
  "plan_cancelled",
]);

export function isNonUsageDeduction(row: { delta: number; reason?: string | null }): boolean {
  return row.delta < 0 && NON_USAGE_DEDUCTION_REASONS.has(row.reason ?? "");
}
