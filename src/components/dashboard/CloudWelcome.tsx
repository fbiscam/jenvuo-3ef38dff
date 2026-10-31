import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Check, ArrowRight, Sparkles, KeyRound, LineChart, Wallet, ShieldCheck, BarChart3 } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FOUNDING_CREDIT_USD, FOUNDING_MONTHS } from "@/lib/founding-offer";

const AURORAS = ["var(--platform-aurora-1)", "var(--platform-aurora-2)", "var(--platform-aurora-3)"];

const QUICK_ACTIONS = [
  { label: "Create API key", to: "/dashboard/api", icon: KeyRound },
  { label: "Open Fiber Terminal", to: "/dashboard/terminal", icon: LineChart },
  { label: "Manage billing", to: "/dashboard/billing", icon: Wallet },
  { label: "Security settings", to: "/dashboard/profile", icon: ShieldCheck },
  { label: "View usage", to: "/dashboard/usage", icon: BarChart3 },
] as const;

type Resource = { title: string; text: string; to: string };
const RESOURCES: Record<string, Resource[]> = {
  "Terminal and charts": [
    { title: "Read sweeps and zones", text: "Learn how fresh sweeps, supply and demand zones and FVGs show on the chart.", to: "/help" },
    { title: "Daily Fiber insights", text: "Follow Fiber sessions with short daily notes and step-by-step guides.", to: "/insights" },
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
    <li className="flex items-center gap-3 text-[16px] text-gc-on-blue">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background/90">
        <Check className="h-3.5 w-3.5 text-gc-blue-deep" strokeWidth={2.5} aria-hidden="true" />
      </span>
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
    <section className="dashboard-cloud-welcome mb-10">
      {/* Platform-style aurora hero card */}
      <div
        className="dash-hero-card relative overflow-hidden rounded-[28px] px-6 py-10 sm:px-10 lg:py-14"
        style={{ backgroundImage: "var(--platform-aurora-1)" }}
      >
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-[13px] font-medium text-gc-ink shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-gc-blue" aria-hidden="true" />
              Welcome, {name}
            </span>
            <div
              role="heading"
              aria-level={1}
              className="mt-4 text-balance text-[32px] font-semibold leading-[1.1] tracking-tight text-gc-on-blue sm:text-[44px]"
            >
              Make the most of Jenvu
            </div>
            <ul className="mt-6 space-y-3">
              <Tick>Read live sweeps, zones and FVGs on Fiber</Tick>
              <Tick>Ask the AI desk about any chart</Tick>
              <Tick>Track usage, billing and API keys in one place</Tick>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/dashboard/billing"
                className="dash-pill inline-flex h-11 items-center gap-1.5 rounded-full bg-background px-6 text-[15px] font-medium text-gc-blue-deep shadow-sm transition hover:bg-gc-blue-soft"
              >
                View my plan <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/dashboard/terminal"
                className="dash-pill inline-flex h-11 items-center rounded-full px-6 text-[15px] font-medium text-gc-on-blue ring-1 ring-gc-on-blue/70 transition hover:bg-gc-on-blue/10"
              >
                Open the Terminal
              </Link>
            </div>
          </div>

          <div className="dash-glass min-w-0 rounded-[22px] bg-background/95 p-6 shadow-lg">
            <p className="text-[13px] font-medium uppercase tracking-wider text-gc-ink-muted">Other options</p>
            <p className="mt-3 text-[17px] font-medium text-gc-ink">Try the latest top-tier AI models</p>
            <Link to="/dashboard/terminal" className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue hover:text-gc-blue-hover">
              Try the AI desk <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div className="my-5 h-px bg-gc-line" />
            {foundingMember ? (
              <>
                <p className="flex items-center gap-2 text-[16px] leading-relaxed text-gc-ink">
                  <Check className="h-5 w-5 shrink-0 text-gc-green" strokeWidth={2.25} aria-hidden="true" />
                  You are already in a program
                </p>
                <Link to="/dashboard/terminal" className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue hover:text-gc-blue-hover">
                  Open the Terminal <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-[15px] leading-relaxed text-gc-ink">
                  {FOUNDING_MONTHS} months of your chosen plan with ${FOUNDING_CREDIT_USD} credit and full Terminal access.
                </p>
                <Link to="/founding" className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue hover:text-gc-blue-hover">
                  Apply for founding program <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions as icon tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {QUICK_ACTIONS.map((a, i) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              to={a.to}
              className="dash-tile group flex flex-col gap-3 rounded-[20px] border border-gc-line/70 bg-background p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundImage: AURORAS[i % AURORAS.length] }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/90 text-gc-ink">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </span>
              <span className="flex items-center justify-between gap-2 text-[14px] font-medium text-gc-ink">
                {a.label}
                <ArrowRight className="h-4 w-4 shrink-0 text-gc-blue opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <div role="heading" aria-level={2} className="text-balance text-[26px] font-semibold tracking-tight text-gc-ink sm:text-[32px]">
          Popular getting started resources
        </div>
        <div className="mx-auto mt-3 h-1 w-24 rounded-full" style={{ backgroundImage: "var(--platform-aurora-1)" }} aria-hidden="true" />
        <div className="mt-6 flex justify-center">
          <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-gc-surface p-1 ring-1 ring-gc-line/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Object.keys(RESOURCES).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`h-9 shrink-0 rounded-full px-4 text-[14px] font-medium transition ${
                  filter === k ? "bg-gc-blue text-gc-on-blue shadow-sm" : "text-gc-ink hover:bg-gc-panel"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCES[filter].map((r, i) => (
          <Link
            key={r.title}
            to={r.to}
            className="dash-tile group flex flex-col overflow-hidden rounded-[20px] border border-gc-line/70 bg-background transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="block h-2" style={{ backgroundImage: AURORAS[i % AURORAS.length] }} aria-hidden="true" />
            <span className="flex flex-1 flex-col p-5">
              <span className="text-[16px] font-medium text-gc-ink">{r.title}</span>
              <span className="mt-2 text-[14px] leading-relaxed text-gc-ink-muted">{r.text}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[14px] font-medium text-gc-blue">
                Learn more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
