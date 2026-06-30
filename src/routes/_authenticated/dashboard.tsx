import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SiteFooter from "@/components/SiteFooter";
import { useCredits } from "@/hooks/useCredits";
import { useLivePriceStream } from "@/hooks/useLivePriceStream";
import {
  Bookmark, Bell, CreditCard, BookOpen, User, LogOut, Mic, ArrowRight,
  Wallet, TrendingUp, LineChart,
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

function PulseTicker({ label, symbol, decimals = 2 }: { label: string; symbol: string; decimals?: number }) {
  const price = useLivePriceStream(symbol, null);
  const [seed, setSeed] = useState<number | null>(null);
  useEffect(() => { if (seed == null && price != null) setSeed(price); }, [price, seed]);
  const change = price != null && seed ? ((price - seed) / seed) * 100 : null;
  const up = (change ?? 0) >= 0;
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full ${up ? "bg-zinc-900" : "bg-zinc-400"}`} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      <span className={`${MONO} text-xs text-zinc-900`}>{price != null ? price.toFixed(decimals) : "—"}</span>
      {change != null && Math.abs(change) > 0.0001 && (
        <span className={`${MONO} text-[10px] text-zinc-500`}>
          {up ? "+" : ""}{change.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

function StatBlock({
  icon: Icon, label, value, sub, href,
}: {
  icon: typeof Wallet; label: string; value: string; sub?: React.ReactNode; href?: string;
}) {
  const body = (
    <div className="group relative h-full border-r border-zinc-200 bg-white p-5 transition last:border-r-0 hover:bg-zinc-50/60">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</span>
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
      </div>
      <div className={`${MONO} mt-3 text-2xl font-semibold text-zinc-900`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
  return href ? <Link to={href as "/dashboard"} className="block h-full">{body}</Link> : body;
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
  const planTier = ((credits.plan as { tier?: string; name?: string } | null)?.tier ?? (credits.plan as { name?: string } | null)?.name ?? "free").toString().toUpperCase();
  const allowancePct = credits.allowance ? Math.min(100, Math.round((credits.balance / credits.allowance) * 100)) : 0;

  return (
    <div className="min-h-dvh w-full bg-white text-zinc-900 font-['Inter',system-ui,sans-serif] antialiased jenvu-zoom">
      <style>{`@media (min-width: 1024px){.jenvu-zoom{zoom:1.35}}`}</style>

      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
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
        {/* Identity row */}
        <section className="flex flex-wrap items-start justify-between gap-5 border-b border-zinc-200 pb-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-base font-semibold text-zinc-900">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">{greeting()}</span>
                <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] text-zinc-700">{planTier}</span>
              </div>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{fullName || "Trader"}</h1>
              <p className="mt-1 text-sm text-zinc-500">{email || "Manage your saved setups, alerts and trade journal."}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/signal"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              <LineChart className="h-4 w-4" /> Signal Desk
            </Link>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Mic className="h-4 w-4" /> Launch AI <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ANALYTICS */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">[ 01 / Analytics ]</h2>
            <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">Live</span>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:grid-cols-4">
            <StatBlock
              icon={Wallet}
              label="Credits"
              value={credits.isLoading ? "…" : `${credits.balance}`}
              href="/dashboard/billing"
              sub={
                <div className="space-y-1.5">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-zinc-900" style={{ width: `${allowancePct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>of {credits.allowance || 0} monthly</span>
                    <span className="font-semibold text-zinc-900">Top up →</span>
                  </div>
                </div>
              }
            />
            <StatBlock icon={Bookmark} label="Saved A+" value={`${counts.saved}`} sub="setups bookmarked" href="/dashboard" />
            <StatBlock icon={Bell} label="Alerts · 7d" value={`${counts.alerts7d}`} sub="fired this week" href="/dashboard/alerts" />
            <StatBlock
              icon={TrendingUp}
              label="Win rate"
              value={counts.journalWinRate != null ? `${counts.journalWinRate}%` : "—"}
              sub={`${counts.journalTotal} journal entries`}
              href="/dashboard/journal"
            />
          </div>

          {/* Market pulse strip */}
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400">Market Pulse</span>
            <span className="hidden h-3 w-px bg-zinc-200 sm:inline" />
            <PulseTicker label="XAU" symbol="XAUUSD" decimals={2} />
            <PulseTicker label="BTC" symbol="BTCUSDT" decimals={1} />
            <PulseTicker label="ETH" symbol="ETHUSDT" decimals={2} />
            <PulseTicker label="DXY" symbol="DXY" decimals={3} />
          </div>
        </section>

        {/* SECTIONS */}
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">[ 02 / Workspace ]</h2>
          </div>

          <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              const Icon = t.icon;
              const count = t.countKey ? counts[t.countKey] : undefined;
              return (
                <Link
                  key={t.to}
                  to={t.to as "/dashboard"}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
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
          </nav>

          <div className="mt-5 pb-16">
            <Outlet />
          </div>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
