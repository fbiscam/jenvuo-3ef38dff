import type { SupabaseClient } from "@supabase/supabase-js";

/** Founding application statuses that unlock the Terminal. */
export const TERMINAL_UNLOCK_STATUSES = ["approved", "active", "graduated", "verified"] as const;

/** Founding members must submit ID verification within this window after approval. */
export const ID_VERIFICATION_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

/** Document states that count as "ID verification done" for the Terminal grace rule. */
const ID_DONE_STATUSES = ["received", "pending", "verified"];

export type TerminalAccess = {
  allowed: boolean;
  reason: "admin" | "founding" | "not_founding" | "id_overdue";
  /** ISO deadline for ID verification, only while it is still outstanding. */
  idDeadline: string | null;
  /** True when documents are submitted but not yet approved. */
  idSubmitted: boolean;
};

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
 * Terminal is only for approved Founding Program members (and admins).
 * Approved members get 2 days to submit ID verification; after that the
 * Terminal locks again until documents are submitted.
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
  if (!row) return { allowed: false, reason: "not_founding", idDeadline: null, idSubmitted: false };
  return evaluateFoundingRow(row);
}
