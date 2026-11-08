import { ID_ACTION_MESSAGE, ID_LOCK_APPLICATION_STATUSES, idActionsLocked } from "@/lib/id-gate";

/** Server check for actions an unverified member can't take yet. Returns the message to show, or null. */
export async function idActionBlock(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: isAdmin } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return null;
  let { data: app } = await db
    .from("founding_applications")
    .select("document_status, status")
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
        .select("document_status, status")
        .ilike("email", email)
        .in("status", ID_LOCK_APPLICATION_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle());
    }
  }
  return idActionsLocked({
    isAdmin: false,
    documentStatus: app?.document_status,
    hasApplication: !!app,
    applicationStatus: app?.status,
  })
    ? ID_ACTION_MESSAGE
    : null;
}

/** The plan running as an active Founding trial for this user, or null. */
export async function activeTrialPlan(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any)
    .from("user_subscriptions")
    .select("plan_id, status, is_trial, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.status !== "active" || !data.is_trial || !data.trial_ends_at) return null;
  return Date.parse(data.trial_ends_at) > Date.now() ? String(data.plan_id) : null;
}
