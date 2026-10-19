import type { SupabaseClient } from "@supabase/supabase-js";

/** Founding application statuses that unlock the Terminal. */
export const TERMINAL_UNLOCK_STATUSES = ["approved", "active", "graduated", "verified"] as const;

/** Founding members must submit ID verification within this window after approval. */
export const ID_VERIFICATION_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

/** Document states that count as "ID verification done" for the Terminal grace rule. */
const ID_DONE_STATUSES = ["received", "pending", "verified"];

export type TerminalAccess = {
  allowed: boolean;
  reason: "admin" | "founding" | "paid" | "trial" | "trial_ended" | "not_founding" | "id_overdue";
  /** ISO deadline for ID verification, only while it is still outstanding. */
  idDeadline: string | null;
  /** True when documents are submitted but not yet approved. */
  idSubmitted: boolean;
  /** ISO end of the free 14-day Terminal trial, only while it is running. */
  trialEndsAt?: string | null;
};

/** Every account gets the Terminal free for this long after sign-up. */
export const TERMINAL_TRIAL_MS = 14 * 24 * 60 * 60 * 1000;
export const PAID_PLANS = ["pro", "elite", "ultra"] as const;

type Sub = {
  plan_id: string | null;
  status: string | null;
  is_trial: boolean | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
};

/**
 * Plan rule: a paid plan (Pro/Elite/Ultra) always unlocks the Terminal.
 * Everyone else (Free) gets it for 14 days after sign-up, or while a Pro
 * trial is running; after that it locks until they upgrade.
 */
export function evaluatePlanAccess(sub: Sub | null, signupAt: string | null, now = Date.now()): TerminalAccess {
  const base = { idDeadline: null, idSubmitted: false };
  const active = (sub?.status || "").toLowerCase() === "active";
  const periodOk = !sub?.current_period_end || Date.parse(sub.current_period_end) > now;
  const paid = active && periodOk && !sub?.is_trial && (PAID_PLANS as readonly string[]).includes(String(sub?.plan_id || "").toLowerCase());
  if (paid) return { ...base, allowed: true, reason: "paid", trialEndsAt: null };
  const ends: number[] = [];
  const signup = Date.parse(signupAt || "");
  if (Number.isFinite(signup)) ends.push(signup + TERMINAL_TRIAL_MS);
  if (active && sub?.is_trial && sub.trial_ends_at) {
    const t = Date.parse(sub.trial_ends_at);
    if (Number.isFinite(t)) ends.push(t);
  }
  const end = ends.length ? Math.max(...ends) : 0;
  if (end > now) return { ...base, allowed: true, reason: "trial", trialEndsAt: new Date(end).toISOString() };
  return { ...base, allowed: false, reason: "trial_ended", trialEndsAt: null };
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
 * Terminal access: admins, approved Founding members (2-day ID rule),
 * paid plans, and every account's first 14 days (see evaluatePlanAccess).
 */
export async function checkTerminalAccess(
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
    // Founding members who missed the ID deadline stay locked until they verify.
    if (founding.allowed || founding.reason === "id_overdue") return founding;
  }

  const [{ data: sub }, { data: authUser }] = await Promise.all([
    (supabaseAdmin as any)
      .from("user_subscriptions")
      .select("plan_id, status, is_trial, current_period_end, trial_ends_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (supabaseAdmin as any).auth.admin.getUserById(userId),
  ]);
  return evaluatePlanAccess(sub ?? null, authUser?.user?.created_at ?? null);
}
