import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoCloseTrades } from "@/hooks/useAutoCloseTrades";
import { useAuthUser } from "@/hooks/useAuthUser";

function AuthenticatedLayout() {
  useAutoCloseTrades();
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();

  // Client-side guard: wait until Supabase has finished restoring the
  // session before deciding to redirect. Avoids a race on hard-refresh
  // or first client-side navigation where getSession() briefly returns
  // null and would otherwise bounce a signed-in user to /auth.
  useEffect(() => {
    if (loading) return;
    if (user) return;
    // One more explicit check to cover the case where the auth event
    // hasn't fired yet in this tab.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        navigate({ to: "/auth", replace: true });
      }
    });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-dvh grid place-items-center bg-white">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
          Loading…
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});
