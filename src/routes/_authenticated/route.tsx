import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAutoCloseTrades } from "@/hooks/useAutoCloseTrades";

function AuthenticatedLayout() {
  useAutoCloseTrades();
  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // No session available during SSR — skip; client-side runs will guard.
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: session.user };
  },
  component: AuthenticatedLayout,
});
