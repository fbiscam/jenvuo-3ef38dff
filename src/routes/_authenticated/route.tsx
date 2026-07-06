import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session?.user) {
        setAuthed(true);
      } else {
        navigate({ to: "/auth" });
      }
      setChecked(true);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (!checked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-zinc-500 text-sm">
        Loading…
      </div>
    );
  }
  if (!authed) return null;
  return <Outlet />;
}
