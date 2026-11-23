/** Every paid account expires at its stored deadline without unpaid grace. */
export const RENEWAL_NOTICE_MS = 0;

export type RenewalRow = {
  plan_id: string | null;
  renewal_due_at: string | null;
  lapsed_plan_id: string | null;
};

export type RenewalState =
  | { kind: "due"; plan: string; deadline: string }
  | { kind: "lapsed"; plan: string }
  | null;

/** What the dashboard should tell the user about their plan expiry. */
export function renewalState(row: RenewalRow | null, now = Date.now()): RenewalState {
  if (!row) return null;
  if (row.plan_id === "free" && row.lapsed_plan_id) return { kind: "lapsed", plan: row.lapsed_plan_id };
  const due = Date.parse(row.renewal_due_at || "");
  if (!row.plan_id || row.plan_id === "free" || !Number.isFinite(due)) return null;
  if (now >= due) {
    return { kind: "lapsed", plan: row.plan_id };
  }
  return null;
}
