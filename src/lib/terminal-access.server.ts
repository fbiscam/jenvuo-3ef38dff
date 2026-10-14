import type { SupabaseClient } from "@supabase/supabase-js";

/** Founding application statuses that unlock the Terminal. */
export const TERMINAL_UNLOCK_STATUSES = ["approved", "active", "graduated", "verified"] as const;

export type TerminalAccess = { allowed: boolean; reason: "admin" | "founding" | "not_founding" };

function escapeLike(v: string) {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Terminal is only for approved Founding Program members (and admins).
 * Admin role is checked as the caller (RLS-safe function); the founding row
 * lookup uses the privileged client because users can only read rows already
 * linked to their user id, while approved rows are often matched by email.
 */
export async function checkTerminalAccess(
  supabase: SupabaseClient<any>,
  userId: string,
  email: string | null | undefined,
): Promise<TerminalAccess> {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return { allowed: true, reason: "admin" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const statuses = [...TERMINAL_UNLOCK_STATUSES];
  const byUser = await (supabaseAdmin as any)
    .from("founding_applications")
    .select("id")
    .eq("user_id", userId)
    .in("status", statuses)
    .limit(1);
  if (byUser.data?.length) return { allowed: true, reason: "founding" };

  const mail = (email || "").trim();
  if (mail) {
    const byEmail = await (supabaseAdmin as any)
      .from("founding_applications")
      .select("id")
      .ilike("email", escapeLike(mail))
      .in("status", statuses)
      .limit(1);
    if (byEmail.data?.length) return { allowed: true, reason: "founding" };
  }
  return { allowed: false, reason: "not_founding" };
}
