import type { SupabaseClient } from "@supabase/supabase-js";

/** Founding application statuses that unlock the Terminal. */
export const TERMINAL_UNLOCK_STATUSES = ["approved", "active", "graduated", "verified"] as const;

/** Founding members must submit ID verification within this window after approval. */
export const ID_VERIFICATION_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

/** Document states that count as "ID verification done" for the Terminal grace rule. */
const ID_DONE_STATUSES = ["received", "pending", "verified"];

export type TerminalAccess = {
  allowed: boolean;
  reason: "admin" | "founding" | "paid" | "trial" | "trial_ended" | "no_plan" | "not_founding" | "id_overdue";
  /** ISO deadline for ID verification, only while it is still outstanding. */
  idDeadline: string | null;
  /** True when documents are submitted but not yet approved. */
  idSubmitted: boolean;
  /** ISO end of the Pro free trial, only while it is running. */
  trialEndsAt?: string | null;
};

export const PAID_PLANS = ["starter", "pro", "elite", "ultra"] as const;

type Sub = {
  plan_id: string | null;
  status: string | null;
  is_trial: boolean | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
};

/**
 * Plan rule (decides the paid Terminal features such as the locked chart
 * strategies, not the Terminal itself): an active paid plan unlocks them for
 * its period, a running Pro free trial until it ends. Free accounts keep the
 * free features only, even when they hold credit.
 */
export function evaluatePlanAccess(sub: Sub | null, now = Date.now()): TerminalAccess {
  const base = { idDeadline: null, idSubmitted: false };
  const status = (sub?.status || "").toLowerCase();
  const active = status === "active" || status === "trialing";
  const periodOk = !sub?.current_period_end || Date.parse(sub.current_period_end) > now;
  const plan = String(sub?.plan_id || "").toLowerCase();
  const paid = active && periodOk && !sub?.is_trial && (PAID_PLANS as readonly string[]).includes(plan);
  if (paid) return { ...base, allowed: true, reason: "paid", trialEndsAt: null };
  const trialEnd = Date.parse(sub?.trial_ends_at || "");
  if (active && sub?.is_trial && Number.isFinite(trialEnd)) {
    if (trialEnd > now) return { ...base, allowed: true, reason: "trial", trialEndsAt: new Date(trialEnd).toISOString() };
    return { ...base, allowed: false, reason: "trial_ended", trialEndsAt: null };
  }
  return { ...base, allowed: false, reason: "no_plan", trialEndsAt: null };
}

/**
 * Terminal rule: the Terminal is only for approved Founding members (who must send
 * their ID within 2 days of approval), admins and accounts on an active paid plan
 * (plans can only be bought by ID-verified Founding members). A free trial or credit
 * never opens it.
 */
export function evaluateTerminalAccess(plan: TerminalAccess | null): TerminalAccess {
  const base = plan ?? { allowed: false, reason: "not_founding", idDeadline: null, idSubmitted: false, trialEndsAt: null };
  const allowed = base.allowed && (base.reason === "admin" || base.reason === "founding" || base.reason === "paid");
  if (allowed) return base;
  return { ...base, allowed: false, reason: base.reason === "id_overdue" ? "id_overdue" : "not_founding" };
}

function escapeLike(v: string) {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`);
}

type Row = { id: string; approved_at: string | null; created_at: string | null; document_status: string | null };

export function evaluateFoundingRow(row: Row, now = Date.now()): TerminalAccess {
  const doc = (row.document_status || "").toLowerCase();
  if (doc === "verified") return { allowed: true, reason: "founding", idDeadline: null, idSubmitted: false };
  if (ID_DONE_STATUSES.includes(doc)) return { allowed: true, reason: "founding", idDeadline: null, idSubmitted: true };
  const start = Date.parse(row.approved_at || row.created_at || "") || now;
  const deadline = start + ID_VERIFICATION_GRACE_MS;
  const iso = new Date(deadline).toISOString();
  if (now > deadline) return { allowed: false, reason: "id_overdue", idDeadline: iso, idSubmitted: false };
  return { allowed: true, reason: "founding", idDeadline: iso, idSubmitted: false };
}

/**
 * Paid-feature access: admins, approved Founding members (2-day ID rule),
 * paid plans and a running Pro free trial. Free users get allowed=false.
 */
export async function checkPlanAccess(
  supabase: SupabaseClient<any>,
  userId: string,
  email: string | null | undefined,
): Promise<TerminalAccess> {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return { allowed: true, reason: "admin", idDeadline: null, idSubmitted: false };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const statuses = [...TERMINAL_UNLOCK_STATUSES];
  const fields = "id, approved_at, created_at, document_status";
  const byUser = await (supabaseAdmin as any)
    .from("founding_applications")
    .select(fields)
    .eq("user_id", userId)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(1);
  let row: Row | undefined = byUser.data?.[0];

  const mail = (email || "").trim();
  if (!row && mail) {
    const byEmail = await (supabaseAdmin as any)
      .from("founding_applications")
      .select(fields)
      .ilike("email", escapeLike(mail))
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(1);
    row = byEmail.data?.[0];
  }
  if (row) {
    const founding = evaluateFoundingRow(row);
    if (founding.allowed) return founding;
  }

  const { data: sub } = await (supabaseAdmin as any)
    .from("user_subscriptions")
    .select("plan_id, status, is_trial, current_period_end, trial_ends_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = evaluatePlanAccess(sub ?? null);
  // Founding members past the ID deadline stay locked (their Founding month is a trial
  // subscription) until they send their ID or buy a paid plan.
  if (row && (!plan.allowed || plan.reason === "trial")) return evaluateFoundingRow(row);
  return plan;
}

/** Terminal access: Founding members (2-day ID rule), admins and paid plans only. */
export async function checkTerminalAccess(
  supabase: SupabaseClient<any>,
  userId: string,
  email: string | null | undefined,
): Promise<TerminalAccess> {
  return evaluateTerminalAccess(await checkPlanAccess(supabase, userId, email));
}
