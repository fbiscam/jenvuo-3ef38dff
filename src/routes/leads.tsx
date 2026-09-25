import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/leadgen/core.functions";
import { LeadsShell } from "@/components/leadgen/LeadsShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/leads")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Jenvu Leads — B2B lead generation desk" },
      {
        name: "description",
        content:
          "Invite-only B2B lead generation: Maps search, people search, website enrichment, CSV import and campaign lists.",
      },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    const signedIn = !!data.session?.user;
    // The section root (leads.jenvu.com) is the public marketing page — guests
    // land there instead of being bounced to sign-in. Every inner tool stays gated.
    const isSectionRoot = location.pathname === "/leads" || location.pathname === "/leads/";
    if (!signedIn && !isSectionRoot) {
      throw redirect({ to: "/leads-signin", search: { redirect: location.href } });
    }
    return { signedIn };
  },
  component: LeadsLayout,
});

function LeadsLayout() {
  const router = useRouter();
  const { signedIn } = Route.useRouteContext();
  const fetchMe = useServerFn(getMe);
  const { data: me, error } = useQuery({
    queryKey: ["lg-me"],
    queryFn: () => fetchMe(),
    retry: false,
    staleTime: 15_000,
    enabled: signedIn,
  });

  // Guest on the section root: render the marketing page bare, no console chrome.
  if (!signedIn) return <Outlet />;

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted p-6">
        <div className="max-w-sm rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-[14px] text-foreground">
            {error instanceof Error ? error.message : "Could not load your account."}
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              router.navigate({ to: "/leads-signin", replace: true });
            }}
            className="mt-4"
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LeadsShell me={me ?? null}>
      <Outlet />
    </LeadsShell>
  );
}

