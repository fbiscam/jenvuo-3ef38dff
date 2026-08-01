import { createServerFn } from "@tanstack/react-start";

export const toolsLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const username = String(data.username ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    if (!username || !password) return { ok: false as const, error: "invalid" };

    const { verifyPassword, getToolsSession } = await import("./tools-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("tool_users")
      .select("id, username, password_hash, display_name, credits, active")
      .eq("username", username)
      .maybeSingle();

    if (!row || !row.active) return { ok: false as const, error: "invalid" };
    if (!(await verifyPassword(password, row.password_hash))) {
      return { ok: false as const, error: "invalid" };
    }

    const session = await getToolsSession();
    await session.update({ toolUserId: row.id, username: row.username });
    await supabaseAdmin.from("tool_users").update({ last_login_at: new Date().toISOString() }).eq("id", row.id);

    return {
      ok: true as const,
      user: { username: row.username, displayName: row.display_name, credits: Number(row.credits) },
    };
  });

export const toolsLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getToolsSession } = await import("./tools-auth.server");
  const session = await getToolsSession();
  await session.clear();
  return { ok: true as const };
});

export const toolsMe = createServerFn({ method: "POST" }).handler(async () => {
  const { getToolsSession } = await import("./tools-auth.server");
  const { isOpsUnlocked } = await import("./admin-guard.server");
  const session = await getToolsSession();
  const uid = session.data.toolUserId;

  if (!uid) {
    // Ops console session gets straight-through access with unlimited credits.
    if (await isOpsUnlocked()) {
      return { signedIn: true as const, ops: true as const, username: "ops", displayName: "Ops Console", credits: Infinity };
    }
    return { signedIn: false as const };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("tool_users")
    .select("username, display_name, credits, active")
    .eq("id", uid)
    .maybeSingle();

  if (!row || !row.active) return { signedIn: false as const };
  return {
    signedIn: true as const,
    ops: false as const,
    username: row.username,
    displayName: row.display_name,
    credits: Number(row.credits),
  };
});
