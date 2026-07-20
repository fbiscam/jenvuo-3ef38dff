import { useSession } from "@tanstack/react-start/server";

type OpsSession = { unlocked?: boolean; who?: string };

/**
 * Returns true when the ops-console session cookie is unlocked.
 * Lets admin-only server fns be reached from inside the ops console
 * without requiring the caller to also hold the Supabase 'admin' role.
 */
export async function isOpsUnlocked(): Promise<boolean> {
  try {
    const secret = process.env.OPS_CONSOLE_SESSION_SECRET;
    if (!secret) return false;
    const session = await useSession<OpsSession>({
      password: secret,
      name: "jenvu-ops",
      maxAge: 60 * 60 * 8,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        partitioned: true,
        path: "/",
      },
    });
    return !!session.data.unlocked;
  } catch {
    return false;
  }
}

/**
 * True if the user holds the admin role OR the ops-console is unlocked.
 * Use inside any admin-gated server function to allow ops-console access.
 */
export async function isAdminOrOpsUnlocked(
  supabase: any,
  userId: string,
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (data) return true;
  } catch {
    // fall through to ops check
  }
  return await isOpsUnlocked();
}
