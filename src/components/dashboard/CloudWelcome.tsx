import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Check, Plus, ArrowRight } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FOUNDING_CREDIT_USD, FOUNDING_MONTHS } from "@/lib/founding-offer";

const QUICK_ACTIONS = [
  { label: "Create API key", to: "/dashboard/api" },
  { label: "Open Gold Terminal", to: "/dashboard/terminal" },
  { label: "Manage billing", to: "/dashboard/billing" },
  { label: "Security settings", to: "/dashboard/profile" },
  { label: "View usage", to: "/dashboard/usage" },
] as const;

type Resource = { title: string; text: string; to: string };
const RESOURCES: Record<string, Resource[]> = {
  "Terminal and charts": [
    { title: "Read sweeps and zones", text: "Learn how fresh sweeps, supply and demand zones and FVGs show on the chart.", to: "/help" },
    { title: "Daily Gold insights", text: "Follow Gold sessions with short daily notes and step-by-step guides.", to: "/insights" },
    { title: "Volume and pressure", text: "See how RVOL spikes and buyer and seller estimates are shown on every candle.", to: "/help" },
  ],
  "AI desk and models": [
    { title: "Ask the AI desk", text: "Get clear chart reads from top-tier AI models, answered only to your question.", to: "/dashboard/terminal" },
    { title: "Model access by plan", text: "Compare which models and limits come with Pro, Elite and Ultra.", to: "/pricing" },
    { title: "Token pricing", text: "Usage is charged at $3 per million tokens from your credit wallet.", to: "/pricing" },
  ],
  "API and developers": [
    { title: "Create your first API key", text: "Plug Jenvu models into your own apps and bots in a few steps.", to: "/dashboard/api" },
    { title: "Track your usage", text: "See tokens, requests and credit spend for every API key.", to: "/dashboard/usage" },
    { title: "Developer docs", text: "Clear guides help you connect, test and ship your project.", to: "/help" },
  ],
  "Billing and plans": [
    { title: "Plans and pricing", text: "Pro $49, Elite $99 and Ultra $169 per month.", to: "/pricing" },
    { title: "Manage billing", text: "Change plan, top up credit and see your invoices.", to: "/dashboard/billing" },
    { title: "Founding Program", text: "3 months of your plan with $250 credit and Terminal access.", to: "/founding" },
  ],
  General: [
    { title: "Help Center", text: "Answers about accounts, security, billing and the Terminal.", to: "/help" },
    { title: "Contact support", text: "Our support team is here to help you get started.", to: "/contact" },
    { title: "Risk disclaimer", text: "Trading involves risk. Read how Jenvu should and should not be used.", to: "/disclaimer" },
  ],
};

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-4 text-[16px] text-gc-ink">
      <Check className="h-5 w-5 shrink-0 text-gc-green" strokeWidth={2.25} aria-hidden="true" />
      {children}
    </li>
  );
}

/** Google Cloud console-style welcome panel for the dashboard home. */
const FOUNDING_MEMBER_STATUSES = ["approved", "active", "graduated", "verified"];

export default function CloudWelcome({ name: profileName }: { name?: string }) {
  const { user } = useAuthUser();
  const [filter, setFilter] = useState<string>(Object.keys(RESOURCES)[0]);
  const [foundingMember, setFoundingMember] = useState(false);
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(profileName?.trim() || meta.full_name || meta.name || user?.email?.split("@")[0] || "trader");

  useEffect(() => {
    const email = user?.email;
    if (!email) return;
    let live = true;
    void supabase
      .from("founding_applications")
      .select("status")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (live) setFoundingMember(FOUNDING_MEMBER_STATUSES.includes(String(data?.status ?? "")));
      });
    return () => { live = false; };
  }, [user?.email]);

  return (
    <section className="dashboard-cloud-welcome -mx-5 -mt-14 mb-10 sm:-mx-8 sm:-mt-7">
      <div
        className="relative overflow-hidden bg-gc-surface px-5 py-12 sm:px-8 lg:py-16"
        style={{
          // full-bleed band: extend the #f8f9fa surface to the panel edges on both sides
          boxShadow: "0 0 0 100vmax var(--gc-surface), 0 1px 0 100vmax var(--gc-line)",
          clipPath: "inset(0 -100vmax -1px)",
        }}
      >
        {/* decorative shapes */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="47%" cy="18%" r="10" className="fill-gc-blue" />
          <circle cx="40%" cy="68%" r="14" className="fill-gc-yellow" />
          <circle cx="82%" cy="20%" r="20" className="fill-gc-green" />
          <circle cx="75%" cy="86%" r="7" className="fill-gc-red" />
        </svg>
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="text-[17px] text-gc-ink">Welcome, {name}</p>
            <div role="heading" aria-level={1} className="mt-2 text-[28px] font-normal leading-tight text-gc-ink sm:text-[34px]">
              Make the most of Jenvu
            </div>
            <ul className="mt-6 space-y-5">
              <Tick>Read live sweeps, zones and FVGs on Gold</Tick>
              <Tick>Ask the AI desk about any chart</Tick>
              <Tick>Track usage, billing and API keys in one place</Tick>
            </ul>
            <Link
              to="/dashboard/billing"
              className="mt-7 inline-flex h-9 items-center rounded bg-gc-blue-deep px-4 text-[14px] font-medium text-gc-on-blue hover:bg-gc-navy"
            >
              View my plan
            </Link>
          </div>

          <div className="min-w-0 border-gc-line lg:border-l lg:pl-6">
            <p className="text-[14px] text-gc-ink-muted">Other options</p>
            <p className="mt-4 text-[16px] text-gc-ink">Try the latest top-tier AI models</p>
            <Link to="/dashboard/terminal" className="mt-4 inline-block text-[14px] font-medium text-gc-blue-deep hover:text-gc-navy">
              Try the AI desk
            </Link>
            {foundingMember ? (
              <>
                <p className="mt-6 flex items-center gap-2 text-[16px] leading-relaxed text-gc-ink">
                  <Check className="h-5 w-5 shrink-0 text-gc-green" strokeWidth={2.25} aria-hidden="true" />
                  You are already in a program
                </p>
                <Link to="/dashboard/terminal" className="mt-4 inline-block text-[14px] font-medium text-gc-blue-deep hover:text-gc-navy">
                  Open the Terminal
                </Link>
              </>
            ) : (
              <>
                <p className="mt-6 text-[16px] leading-relaxed text-gc-ink">
                  {FOUNDING_MONTHS} months of your chosen plan with ${FOUNDING_CREDIT_USD} credit and full Terminal access.
                </p>
                <Link to="/founding" className="mt-4 inline-block text-[14px] font-medium text-gc-blue-deep hover:text-gc-navy">
                  Apply for founding program
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 lg:px-0">
        <div className="flex flex-wrap gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="inline-flex h-9 items-center gap-2 rounded border border-gc-line bg-background px-3.5 text-[14px] text-gc-ink hover:bg-gc-surface"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {a.label}
            </Link>
          ))}
        </div>

        <div role="heading" aria-level={2} className="mt-8 text-[24px] font-normal text-gc-ink">Popular getting started resources</div>
        <p className="mt-4 text-[15px] text-gc-ink-muted">Filter by</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(RESOURCES).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`h-8 rounded-full px-4 text-[14px] transition ${
                filter === k ? "bg-gc-blue-soft text-gc-blue-deep" : "bg-gc-surface text-gc-ink hover:bg-gc-line/60"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES[filter].map((r) => (
            <Link
              key={r.title}
              to={r.to}
              className="group rounded-lg border border-gc-line bg-background p-5 transition hover:shadow-md"
            >
              <div className="text-[16px] font-medium text-gc-ink">{r.title}</div>
              <p className="mt-2 text-[14px] leading-relaxed text-gc-ink-muted">{r.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue-deep">
                Learn more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
