import { ID_ACTION_MESSAGE, idActionsLocked } from "@/lib/id-gate";

/** Server check for actions an unverified member can't take yet. Returns the message to show, or null. */
export async function idActionBlock(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: isAdmin } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return null;
  let { data: app } = await db
    .from("founding_applications")
    .select("document_status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!app) {
    const { data: u } = await db.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (email) {
      ({ data: app } = await db
        .from("founding_applications")
        .select("document_status")
        .ilike("email", email)
        .in("status", ["approved", "active", "graduated", "verified"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle());
    }
  }
  return idActionsLocked({ isAdmin: false, documentStatus: app?.document_status, hasApplication: !!app }) ? ID_ACTION_MESSAGE : null;
}
