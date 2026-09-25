import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Verifies a scheduled-job caller. Accepts either the managed Lovable cron
 * bearer token or the rotating database scheduler credential sent in
 * `x-cron-secret` (checked server-side against the private store).
 */
export async function isAuthorizedCronRequest(request: Request): Promise<boolean> {
  if (request.headers.get("authorization")) {
    try {
      if ((await authenticateCronRequest(request)) === null) return true;
    } catch {
      /* fall through */
    }
  }
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (provided.length < 32) return false;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any).rpc("verify_cron_secret", { _secret: provided });
    return !error && data === true;
  } catch {
    return false;
  }
}

export function cronUnauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
