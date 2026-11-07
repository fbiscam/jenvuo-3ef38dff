/**
 * What to do when someone submits the Founding form with an email that already has an
 * application. Pure so it can be tested; the server looks up the row and the account.
 *
 * - Under review (pending / waitlisted): block, it's a real duplicate.
 * - Approved / active / graduated AND the account still exists: block with a sign-in hint.
 * - Rejected, or the account was removed: reopen (old row is replaced by the new one).
 */
export type ReapplyDecision =
  | { action: "insert" }
  | { action: "reopen" }
  | { action: "block"; error: string };

export const REAPPLY_MESSAGES = {
  underReview: "Your application is already in and under review. We'll email you soon.",
  member: "This email is already a Founding member. Please sign in to your dashboard.",
  used: "This email has already used its Founding month. Sign in and choose a plan.",
} as const;

export function foundingReapplyDecision(
  existing: { status: string | null } | null,
  hasAccount: boolean,
): ReapplyDecision {
  if (!existing) return { action: "insert" };
  const status = (existing.status ?? "pending").toLowerCase();
  if (status === "pending" || status === "waitlisted") {
    return { action: "block", error: REAPPLY_MESSAGES.underReview };
  }
  if (status === "rejected") return { action: "reopen" };
  if (!hasAccount) return { action: "reopen" };
  if (status === "graduated") return { action: "block", error: REAPPLY_MESSAGES.used };
  return { action: "block", error: REAPPLY_MESSAGES.member };
}
