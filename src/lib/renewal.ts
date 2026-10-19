/** Founding plans renew on the 1st; unpaid renewals get this notice period before moving to Free. */
export const RENEWAL_NOTICE_MS = 3 * 24 * 60 * 60 * 1000;

export type RenewalRow = {
  plan_id: string | null;
  renewal_due_at: string | null;
  lapsed_plan_id: string | null;
};

export type RenewalState =
  | { kind: "due"; plan: string; deadline: string }
  | { kind: "lapsed"; plan: string }
  | null;

/** What the dashboard should tell the user about their founding renewal. */
export function renewalState(row: RenewalRow | null, now = Date.now()): RenewalState {
  if (!row) return null;
  if (row.plan_id === "free" && row.lapsed_plan_id) return { kind: "lapsed", plan: row.lapsed_plan_id };
  const due = Date.parse(row.renewal_due_at || "");
  if (!row.plan_id || row.plan_id === "free" || !Number.isFinite(due)) return null;
  if (now >= due && now < due + RENEWAL_NOTICE_MS) {
    return { kind: "due", plan: row.plan_id, deadline: new Date(due + RENEWAL_NOTICE_MS).toISOString() };
  }
  return null;
}
