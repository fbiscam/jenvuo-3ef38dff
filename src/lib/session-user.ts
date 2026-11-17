import { supabase } from "@/integrations/supabase/client";

/**
 * Signed-in user read from the session already stored in the browser — no network
 * round trip (unlike `auth.getUser()`), so dashboard widgets don't each wait 1–2s on
 * load. Every data read still goes through row-level security on the server.
 * Returns the same `{ data: { user } }` shape as `auth.getUser()`.
 */
export async function readSessionUser() {
  const { data } = await supabase.auth.getSession();
  return { data: { user: data.session?.user ?? null } };
}
