import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SiteFooter from "@/components/SiteFooter";
import { useCredits } from "@/hooks/useCredits";
import { useLivePriceStream } from "@/hooks/useLivePriceStream";
import {
  Bookmark, Bell, CreditCard, BookOpen, User, LogOut, Mic, ArrowRight,
  Activity, Sparkles, TrendingUp, Wallet, Zap, LineChart, NotebookPen,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Jenvu" },
      { name: "description", content: "Your saved A+ setups, alert preferences, trade journal, and billing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

type Counts = { saved: number; alerts7d: number; journalWinRate: number | null; journalTotal: number };

const TABS: Array<{ to: string; label: string; icon: typeof Bookmark; exact?: boolean; countKey?: keyof Counts }> = [
  { to: "/dashboard", label: "Saved", icon: Bookmark, exact: true, countKey: "saved" },
  { to: "/dashboard/alerts", label: "Alerts", icon: Bell, countKey: "alerts7d" },
  { to: "/dashboard/journal", label: "Journal", icon: BookOpen },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function planLabel(plan?: { tier?: string; name?: string } | null) {
  const tier = (plan?.tier ?? "free").toLowerCase();
  if (tier === "elite") return { label: "ELITE", cls: "bg-zinc-900 text-white" };
  if (tier === "pro")   return { label: "PRO",   cls: "bg-amber-100 text-amber-900 border border-amber-200" };
  return { label: "FREE", cls: "bg-zinc-100 text-zinc-700 border border-zinc-200" };
}

function PulseTicker({ label, symbol, decimals = 2 }: { label: string; symbol: string; decimals?: number }) {
  const price = useLivePriceStream(symbol, null);
  const [seed, setSeed] = useState<number | null>(null);
  useEffect(() => { if (seed == null && price != null) setSeed(price); }, [price, seed]);
  const change = price != null && seed ? ((price - seed) / seed) * 100 : null;
  const up = (change ?? 0) >= 0;
  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap">
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className={`absolute inset-0 animate-ping rounded-full ${up ? "bg-emerald-400" : "bg-rose-400"} opacity-60`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${up ? "bg-emerald-500" : "bg-rose-500"}`} />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      <span className={`${MONO} text-xs text-zinc-900`}>{price != null ? price.toFixed(decimals) : "—"}</span>
      {change != null && Math.abs(change) > 0.0001 && (
        <span className={`${MONO} text-[10px] ${up ? "text-emerald-600" : "text-rose-600"}`}>
          {up ? "+" : ""}{change.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, accent, href,
}: {
  icon: typeof Wallet; label: string; value: string; sub?: React.ReactNode; accent: string; href?: string;
}) {
  const body = (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.15)]">
      <div className={`absolute inset-x-0 top-0 h-px ${accent}`} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</span>
        <Icon className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition" />
      </div>
      <div className={`${MONO} mt-2 text-2xl font-semibold text-zinc-900`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
  return href ? <Link to={href as "/dashboard"} className="block">{body}</Link> : body;
}

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [counts, setCounts] = useState<Counts>({ saved: 0, alerts7d: 0, journalWinRate: null, journalTotal: 0 });
  const credits = useCredits();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      setEmail(u.email ?? "");
      setFullName((u.user_metadata?.full_name as string) ?? (u.email?.split("@")[0] ?? ""));
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [saved, alerts, journal] = await Promise.all([
        supabase.from("saved_signals").select("id", { count: "exact", head: true }),
        supabase.from("signal_alerts").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("trade_journal").select("outcome").eq("user_id", u.id),
      ]);
      const rows = (journal.data ?? []) as Array<{ outcome: string }>;
      const decided = rows.filter(r => r.outcome === "win" || r.outcome === "loss");
      const wins = decided.filter(r => r.outcome === "win").length;
      setCounts({
        saved: saved.count ?? 0,
        alerts7d: alerts.count ?? 0,
        journalTotal: rows.length,
        journalWinRate: decided.length ? Math.round((wins / decided.length) * 100) : null,
      });
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const initial = (fullName || email || "J").trim().charAt(0).toUpperCase();
  const plan = useMemo(() => planLabel(credits.plan as any), [credits.plan]);
  const allowancePct = credits.allowance ? Math.min(100, Math.round((credits.balance / credits.allowance) * 100)) : 0;

  return (
    <div className="min-h-dvh w-full bg-zinc-50 text-zinc-900 font-['Inter',system-ui,sans-serif] antialiased jenvu-zoom">
      <style>{`@media (min-width: 1024px){.jenvu-zoom{zoom:1.35}}`}</style>

      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="JENVU AI" className="h-6 w-6 rounded-md object-contain" />
            <span className="font-semibold tracking-tight">JENVU AI</span>
            <span className="ml-2 hidden text-[10px] uppercase tracking-[0.25em] text-zinc-400 sm:inline">Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-500 sm:inline">{email}</span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8">
        {/* Hero band */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50 p-6 sm:p-7">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-300 via-zinc-900 to-amber-300" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-100/40 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-zinc-200/40 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-lg font-semibold text-white shadow-lg shadow-zinc-900/15">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">{greeting()}</span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] ${plan.cls}`}>{plan.label}</span>
                </div>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{fullName || "Trader"}</h1>
                <p className="mt-1 text-sm text-zinc-500">{email || "Manage your saved setups, alerts and trade journal."}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/signal"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <LineChart className="h-4 w-4" /> Signal Desk
              </Link>
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-zinc-900/15 transition hover:gap-3 hover:bg-zinc-800"
              >
                <Mic className="h-4 w-4" /> Launch AI <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Pulse strip */}
          <div className="relative mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-zinc-100 bg-white/70 px-4 py-2.5 backdrop-blur">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400">Market Pulse</span>
            <span className="hidden h-3 w-px bg-zinc-200 sm:inline" />
            <PulseTicker label="XAU" symbol="XAUUSD" decimals={2} />
            <PulseTicker label="BTC" symbol="BTCUSDT" decimals={1} />
            <PulseTicker label="ETH" symbol="ETHUSDT" decimals={2} />
            <PulseTicker label="DXY" symbol="DXY" decimals={3} />
          </div>
        </section>

        {/* KPI strip */}
        <section className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard
            icon={Wallet}
            label="Credits"
            value={credits.isLoading ? "…" : `${credits.balance}`}
            accent="bg-gradient-to-r from-amber-400 to-amber-200"
            sub={
              <div className="space-y-1.5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${allowancePct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span>of {credits.allowance || 0} monthly</span>
                  <Link to="/dashboard/billing" className="font-semibold text-zinc-900 hover:underline">Top up</Link>
                </div>
              </div>
            }
            href="/dashboard/billing"
          />
          <KpiCard
            icon={Bookmark}
            label="Saved A+"
            value={`${counts.saved}`}
            accent="bg-gradient-to-r from-zinc-900 to-zinc-500"
            sub={<span>setups bookmarked</span>}
            href="/dashboard"
          />
          <KpiCard
            icon={Bell}
            label="Alerts · 7d"
            value={`${counts.alerts7d}`}
            accent="bg-gradient-to-r from-sky-400 to-sky-200"
            sub={<span>fired this week</span>}
            href="/dashboard/alerts"
          />
          <KpiCard
            icon={TrendingUp}
            label="Win rate"
            value={counts.journalWinRate != null ? `${counts.journalWinRate}%` : "—"}
            accent="bg-gradient-to-r from-emerald-400 to-emerald-200"
            sub={<span>{counts.journalTotal} journal entries</span>}
            href="/dashboard/journal"
          />
        </section>

        {/* Quick actions */}
        <section className="mt-5 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          {[
            { to: "/app", icon: Sparkles, title: "Launch Voice AI", desc: "Talk to Jenvu, get instant context.", tint: "hover:border-amber-300 hover:bg-amber-50/60", iconCls: "text-amber-600" },
            { to: "/signal", icon: Activity, title: "Open Signal Desk", desc: "Live A+ scans, ICT/SMC narration.", tint: "hover:border-emerald-300 hover:bg-emerald-50/60", iconCls: "text-emerald-600" },
            { to: "/dashboard/journal", icon: NotebookPen, title: "Log a Trade", desc: "Track entry, outcome and notes.", tint: "hover:border-sky-300 hover:bg-sky-50/60", iconCls: "text-sky-600" },
          ].map(({ to, icon: Icon, title, desc, tint, iconCls }) => (
            <Link
              key={to}
              to={to as "/app"}
              className={`group flex items-center gap-3.5 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 transition ${tint}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 ${iconCls}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-zinc-900">{title}</div>
                <div className="truncate text-[11px] text-zinc-500">{desc}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-700" />
            </Link>
          ))}
        </section>

        {/* Tab nav — pills */}
        <nav className="mt-7 flex flex-wrap items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white p-1.5">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            const Icon = t.icon;
            const count = t.countKey ? counts[t.countKey] : undefined;
            return (
              <Link
                key={t.to}
                to={t.to as "/dashboard"}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
                  active
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {typeof count === "number" && count > 0 && (
                  <span className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="ml-auto hidden items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 sm:flex">
            <Zap className="h-3 w-3" /> Live
          </div>
        </nav>

        <div className="mt-6 pb-16">
          <Outlet />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
