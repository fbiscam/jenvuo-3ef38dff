// Project-specific bearer attacher: refreshes an expired/near-expiry Supabase
// session before attaching it, so server fns don't fail with "Invalid token".
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const attachFreshSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      let session = data.session;
      const expiresAt = session?.expires_at ?? 0;
      // Refresh when missing, expired, or expiring within 60s.
      if (session && expiresAt * 1000 - Date.now() < 60_000) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session ?? session;
      }
      token = session?.access_token;
    } catch {
      token = undefined;
    }
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
