import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Users, Globe, Upload } from "lucide-react";
import { getOverview } from "@/lib/leadgen/core.functions";
import { Card, PageHeader } from "@/components/leadgen/LeadsShell";

export const Route = createFileRoute("/leads/")({
  head: () => ({
    meta: [
      { title: "Overview — Jenvu Leads" },
      { name: "description", content: "Credits, saved leads and recent campaign lists at a glance." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Overview,
});

const SHORTCUTS = [
  { to: "/leads/maps", label: "Maps search", desc: "Find local businesses", icon: MapPin },
  { to: "/leads/people", label: "People search", desc: "Find decision makers", icon: Users },
  { to: "/leads/enrich", label: "Enrich", desc: "Crawl a website for contacts", icon: Globe },
  { to: "/leads/import", label: "Import CSV", desc: "Bring your own list", icon: Upload },
];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="text-[12px] font-medium uppercase tracking-wide text-[#5F6368]">{label}</div>
      <div className="mt-2 text-[28px] font-normal leading-none text-[#202124]">{value}</div>
      {sub && <div className="mt-1.5 text-[12px] text-[#80868B]">{sub}</div>}
    </Card>
  );
}

function Overview() {
  const fetchOverview = useServerFn(getOverview);
  const { data, isLoading } = useQuery({ queryKey: ["lg-overview"], queryFn: () => fetchOverview() });

  return (
    <>
      <PageHeader title="Overview" description="Your credits, leads and recent lists." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Credits remaining"
          value={isLoading ? "—" : (data?.credits.remaining ?? 0).toFixed(2)}
          sub={`Limit ${(data?.credits.monthly_limit ?? 0).toFixed(0)} / month`}
        />
        <Stat
          label="Credits used"
          value={isLoading ? "—" : (data?.credits.used ?? 0).toFixed(2)}
          sub="Resets on the 1st"
        />
        <Stat label="Saved leads" value={isLoading ? "—" : String(data?.leads ?? 0)} />
        <Stat label="Lists" value={isLoading ? "—" : String(data?.lists ?? 0)} />
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-medium text-[#3C4043]">Shortcuts</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to}>
            <Card className="h-full p-5 transition hover:border-[#1A73E8] hover:bg-[#F8FBFF]">
              <s.icon className="h-5 w-5 text-[#1A73E8]" strokeWidth={1.8} />
              <div className="mt-3 text-[14px] font-medium text-[#202124]">{s.label}</div>
              <div className="mt-1 text-[12px] text-[#5F6368]">{s.desc}</div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-medium text-[#3C4043]">Recent lists</h2>
      <Card>
        {(data?.recentLists ?? []).length === 0 ? (
          <div className="p-6 text-[13px] text-[#5F6368]">
            No lists yet.{" "}
            <Link to="/leads/lists" className="text-[#1A73E8] hover:underline">
              Create your first list
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-[#E8EAED]">
            {(data?.recentLists ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-3">
                <Link to="/leads/lists" className="text-[13px] text-[#1A73E8] hover:underline">
                  {l.name}
                </Link>
                <span className="text-[12px] text-[#80868B]">
                  {new Date(l.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
