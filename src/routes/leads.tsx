import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/leadgen/core.functions";
import { LeadsShell } from "@/components/leadgen/LeadsShell";

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
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      throw redirect({ to: "/leads-signin", search: { redirect: location.href } });
    }
  },
  component: LeadsLayout,
});

function LeadsLayout() {
  const router = useRouter();
  const fetchMe = useServerFn(getMe);
  const { data: me, error } = useQuery({
    queryKey: ["lg-me"],
    queryFn: () => fetchMe(),
    retry: false,
    staleTime: 15_000,
  });

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F8F9FA] p-6">
        <div className="max-w-sm rounded-lg border border-[#DADCE0] bg-white p-6 text-center">
          <p className="text-[14px] text-[#202124]">
            {error instanceof Error ? error.message : "Could not load your account."}
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.navigate({ to: "/leads-signin", replace: true });
            }}
            className="mt-4 rounded border border-[#DADCE0] px-4 py-2 text-[13px] hover:bg-[#F1F3F4]"
          >
            Sign out
          </button>
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
