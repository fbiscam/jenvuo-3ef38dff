import { createServerFn } from "@tanstack/react-start";

async function assertOps() {
  const { isOpsUnlocked } = await import("./admin-guard.server");
  if (!(await isOpsUnlocked())) throw new Error("Forbidden");
}

export const adminListToolUsers = createServerFn({ method: "POST" }).handler(async () => {
  await assertOps();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tool_users")
    .select("id, username, display_name, credits, active, created_at, last_login_at")
    .order("created_at", { ascending: false });
  const { data: searches } = await supabaseAdmin
    .from("tool_lead_searches")
    .select("id, tool_user_id, query, results_count, credits_spent, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return { users: data ?? [], searches: searches ?? [] };
});

export const adminCreateToolUser = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string; displayName?: string; credits?: number }) => data)
  .handler(async ({ data }) => {
    await assertOps();
    const username = String(data.username ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    if (username.length < 3 || password.length < 6) return { ok: false as const, error: "invalid_input" };

    const { hashPassword } = await import("./tools-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("tool_users").insert({
      username,
      password_hash: await hashPassword(password),
      display_name: data.displayName?.trim() || null,
      credits: Math.max(0, Number(data.credits) || 0),
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const adminUpdateToolUser = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string; creditsDelta?: number; active?: boolean; newPassword?: string; remove?: boolean }) => data,
  )
  .handler(async ({ data }) => {
    await assertOps();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.remove) {
      await supabaseAdmin.from("tool_users").delete().eq("id", data.id);
      return { ok: true as const };
    }

    const patch: { active?: boolean; password_hash?: string; credits?: number } = {};
    if (typeof data.active === "boolean") patch.active = data.active;
    if (data.newPassword && data.newPassword.length >= 6) {
      const { hashPassword } = await import("./tools-auth.server");
      patch.password_hash = await hashPassword(data.newPassword);
    }

    if (typeof data.creditsDelta === "number" && data.creditsDelta !== 0) {
      const { data: row } = await supabaseAdmin.from("tool_users").select("credits").eq("id", data.id).maybeSingle();
      const next = Math.max(0, Number(row?.credits ?? 0) + data.creditsDelta);
      patch.credits = next;
      await supabaseAdmin.from("tool_user_credit_log").insert({
        tool_user_id: data.id,
        delta: data.creditsDelta,
        reason: data.creditsDelta > 0 ? "admin_grant" : "admin_deduct",
        balance_after: next,
      });
    }

    if (Object.keys(patch).length) {
      const { error } = await supabaseAdmin.from("tool_users").update(patch).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });
