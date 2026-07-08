import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoCloseTrades } from "@/hooks/useAutoCloseTrades";
import { useAuthUser } from "@/hooks/useAuthUser";

function AuthenticatedLayout() {
  useAutoCloseTrades();
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Client-side guard: wait until Supabase has finished restoring the
  // session before deciding to redirect. Avoids a race on hard-refresh
  // where getSession() briefly returns null and would otherwise bounce
  // a signed-in user to /auth.
  useEffect(() => {
    if (!mounted) return;
    if (loading) return;
    if (user) {
      // Block unverified emails from reaching the dashboard.
      // Confirmed users have email_confirmed_at (or confirmed_at) set.
      const confirmedAt =
        (user as { email_confirmed_at?: string | null; confirmed_at?: string | null })
          .email_confirmed_at ??
        (user as { confirmed_at?: string | null }).confirmed_at;
      if (!confirmedAt) {
        supabase.auth.signOut().finally(() => {
          navigate({
            to: "/auth",
            search: { verify: "1" } as never,
            replace: true,
          });
        });
        return;
      }
      // Block dashboard if MFA elevation is required but not completed.
      supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
        if (data && data.currentLevel === "aal1" && data.nextLevel === "aal2") {
          navigate({ to: "/auth", replace: true });
        }
      });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        navigate({ to: "/auth", replace: true });
      }
    });
  }, [mounted, loading, user, navigate]);

  // IMPORTANT: render <Outlet /> on both the server and the first client
  // paint so hydration matches. If we conditionally rendered a "Loading…"
  // placeholder here based on client-only localStorage state, React would
  // detect a hydration mismatch and throw away the whole subtree — which
  // was causing the dashboard to flash blank and sometimes fail to load
  // its data. Child pages already handle their own auth-loading UI.
  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});
