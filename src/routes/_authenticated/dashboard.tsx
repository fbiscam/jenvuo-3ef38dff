import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import SiteFooter from "@/components/SiteFooter";
import { useCredits } from "@/hooks/useCredits";
import { useLivePriceStream } from "@/hooks/useLivePriceStream";
import { getMarketSnapshot } from "@/lib/gold-analysis.functions";
import {
  Bookmark, Bell, CreditCard, BookOpen, User, LogOut, Mic, Plus,
  Wallet, TrendingUp, LineChart, Activity, ShieldCheck, Gauge,
  MoreHorizontal, Tag, ArrowUpRight, ArrowRight, CheckCircle2, Calendar,
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

/* ---------- helpers ---------- */

function Sparkline({ seed = 1, tone = "blue", empty = false }: { seed?: number; tone?: "blue" | "rose" | "zinc"; empty?: boolean }) {
  const w = 120, h = 36;

  // deterministic pseudo-random points so SSR/CSR match
  const pts = useMemo(() => {
    const n = 24;
    const arr: number[] = [];
    for (let i = 0; i < n; i++) {
      const s = Math.sin((i + seed) * 1.7) * 12 + Math.cos((i + seed) * 0.9) * 8;
      arr.push(Math.max(8, Math.min(92, 50 + s + ((seed * 7) % 9) - 4)));
    }
    return arr;
  }, [seed]);

  const stroke = tone === "rose" ? "#f43f5e" : tone === "zinc" ? "#71717a" : "#3b82f6";

  if (empty) {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
        <line
          x1="0" y1={h - 4} x2={w} y2={h - 4}
          stroke="#e4e4e7" strokeWidth="1.25" strokeDasharray="3 3" strokeLinecap="round"
        />
      </svg>
    );
  }

  const step = w / (pts.length - 1);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (p / 100) * h).toFixed(1)}`).join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  const fillId = `spark-${tone}-${seed}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Metric({
  label, value, delta, tone = "blue", seed = 1,
}: {
  label: string; value: React.ReactNode; delta?: string | null; tone?: "blue" | "rose" | "zinc"; seed?: number;
}) {
  const negative = delta?.startsWith("-");
  const raw = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  const numeric = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
  const isEmpty = raw === "" || raw === "—" || raw === "…" || (!Number.isNaN(numeric) && numeric === 0);

  return (
    <div className="flex-1 min-w-0 p-4">
      <div className="flex items-center gap-1 text-[12px] text-zinc-500">
        {label}
        <span className="opacity-50">ⓘ</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-[22px] font-semibold tracking-tight ${isEmpty ? "text-zinc-400" : "text-zinc-900"}`}>{value}</span>
        {delta && !isEmpty && (
          <span className={`inline-flex items-center text-[11px] font-medium ${negative ? "text-rose-600" : "text-emerald-600"}`}>
            <ArrowUpRight className={`h-3 w-3 ${negative ? "rotate-90" : ""}`} />
            {delta.replace("-", "")}
          </span>
        )}
      </div>
      <div className="mt-2 -mb-1 opacity-90">
        <Sparkline seed={seed} tone={tone} empty={isEmpty} />
      </div>
    </div>
  );
}

function CardHeader({ icon: Icon, title, right }: { icon: typeof ShieldCheck; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-700">
        <Icon className="h-4 w-4 text-zinc-500" />
        {title}
      </div>
      {right}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

/* ---------- live ticker row ---------- */

function TickerRow({ label, symbol, decimals = 2 }: { label: string; symbol: string; decimals?: number }) {
  const livePrice = useLivePriceStream(symbol, null);
  const fetchSnapshot = useServerFn(getMarketSnapshot);
  const [snap, setSnap] = useState<{ price: number; prevClose: number | null } | null>(null);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const s = await fetchSnapshot({ data: { symbol } });
        if (!stopped && s) setSnap({ price: s.price, prevClose: s.prevClose });
      } catch { /* keep last */ }
    };
    void tick();
    const id = setInterval(tick, 15_000);
    return () => { stopped = true; clearInterval(id); };
  }, [symbol, fetchSnapshot]);

  const price = livePrice ?? snap?.price ?? null;
  const change = price != null && snap?.prevClose ? ((price - snap.prevClose) / snap.prevClose) * 100 : null;
  const up = (change ?? 0) >= 0;

  return (
    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-[13px] font-medium text-zinc-800">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[12px] text-zinc-600">{price != null ? price.toFixed(decimals) : "—"}</span>
        {change != null ? (
          <span className={`font-mono text-[11px] ${up ? "text-emerald-600" : "text-rose-600"}`}>
            {up ? "+" : ""}{change.toFixed(2)}%
          </span>
        ) : (
          <span className="font-mono text-[11px] text-zinc-400">—</span>
        )}
      </div>
    </div>
  );
}

/* ---------- layout ---------- */

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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

  const planTier = ((credits.plan as { tier?: string; name?: string } | null)?.tier
    ?? (credits.plan as { name?: string } | null)?.name ?? "free").toString().toUpperCase();
  const allowancePct = credits.allowance ? Math.min(100, Math.round((credits.balance / credits.allowance) * 100)) : 0;

  return (
    <div className="min-h-dvh w-full bg-white text-zinc-900 font-['Inter',system-ui,sans-serif] antialiased jenvu-zoom">
      <style>{`@media (min-width: 1024px){.jenvu-zoom{zoom:1.2}}`}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="JENVU AI" className="h-6 w-6 rounded-md object-contain" />
            <span className="font-semibold tracking-tight">JENVU AI</span>
            <span className="ml-2 hidden text-[11px] text-zinc-400 sm:inline">/ Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-zinc-500 sm:inline">{email}</span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
        {/* Identity row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] text-zinc-500">Account home</div>
            <h1 className="mt-1 truncate text-[26px] font-semibold tracking-tight text-zinc-900 sm:text-[30px]">
              {email || fullName}<span className="text-zinc-500">'s Account</span>
            </h1>
            <div className="mt-1 text-[12px] text-zinc-500">
              {greeting()}, {fullName || "Trader"} · Plan <span className="font-medium text-zinc-700">{planTier}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="rounded-md border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-50" aria-label="Tags">
              <Tag className="h-4 w-4" />
            </button>
            <button className="rounded-md border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-50" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1d6df1] px-3 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-[#1559cc]"
            >
              <Plus className="h-4 w-4" /> Launch AI
            </Link>
          </div>
        </div>

        {/* Analytics header */}
        <div className="mt-7 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-zinc-900">Analytics</h2>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] text-zinc-700 hover:bg-zinc-50">
            <Calendar className="h-3.5 w-3.5" /> Last 7 days
          </button>
        </div>

        {/* Row 1 — three analytics cards each with 2 metrics + sparkline */}
        <section className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader icon={ShieldCheck} title="Credits & Plan" />
            <div className="flex divide-x divide-zinc-200">
              <Metric
                label="Credits balance"
                value={credits.isLoading ? "…" : credits.balance}
                delta={`${allowancePct}%`}
                tone="blue"
                seed={3}
              />
              <Metric
                label="Monthly allowance"
                value={credits.allowance || 0}
                delta={null}
                tone="zinc"
                seed={5}
              />
            </div>
          </Card>

          <Card>
            <CardHeader icon={Gauge} title="Performance" />
            <div className="flex divide-x divide-zinc-200">
              <Metric
                label="Win rate"
                value={counts.journalWinRate != null ? `${counts.journalWinRate}%` : "0.0%"}
                delta={null}
                tone="blue"
                seed={7}
              />
              <Metric
                label="Journal entries"
                value={counts.journalTotal}
                delta={null}
                tone="rose"
                seed={11}
              />
            </div>
          </Card>

          <Card>
            <CardHeader icon={Activity} title="Activity" />
            <div className="flex divide-x divide-zinc-200">
              <Metric
                label="Saved A+ setups"
                value={counts.saved}
                delta={counts.saved > 0 ? `${counts.saved}` : null}
                tone="blue"
                seed={13}
              />
              <Metric
                label="Alerts · 7d"
                value={counts.alerts7d}
                delta={counts.alerts7d > 0 ? `${counts.alerts7d}` : null}
                tone="blue"
                seed={17}
              />
            </div>
          </Card>
        </section>

        {/* Row 2 — Market Pulse + two CTA cards */}
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader
              icon={LineChart}
              title="Market Pulse"
              right={
                <Link to="/signal" className="inline-flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-900">
                  <span>12</span> <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="max-h-[360px] overflow-y-auto">
              <TickerRow label="XAU / USD" symbol="XAUUSD" decimals={2} />
              <TickerRow label="XAG / USD" symbol="XAGUSD" decimals={3} />
              <TickerRow label="DXY" symbol="DXY" decimals={3} />
              <TickerRow label="EUR / USD" symbol="EURUSD" decimals={5} />
              <TickerRow label="GBP / USD" symbol="GBPUSD" decimals={5} />
              <TickerRow label="USD / JPY" symbol="USDJPY" decimals={3} />
              <TickerRow label="BTC / USDT" symbol="BTCUSDT" decimals={1} />
              <TickerRow label="ETH / USDT" symbol="ETHUSDT" decimals={2} />
              <TickerRow label="SOL / USDT" symbol="SOLUSDT" decimals={2} />
              <TickerRow label="BNB / USDT" symbol="BNBUSDT" decimals={2} />
              <TickerRow label="XRP / USDT" symbol="XRPUSDT" decimals={4} />
              <TickerRow label="DOGE / USDT" symbol="DOGEUSDT" decimals={5} />
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader icon={Mic} title="Voice Agent" right={<ArrowRight className="h-4 w-4 text-zinc-400" />} />
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100">
                <Mic className="h-5 w-5 text-zinc-700" />
              </div>
              <h3 className="mt-3 text-[14px] font-semibold text-zinc-900">Talk to Jenvu, get instant context</h3>
              <p className="mt-1 max-w-[260px] text-[12px] text-zinc-500">
                From ICT bias to a one-tap A+ entry — your gold co-pilot, hands free.
              </p>
              <Link to="/app" className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-800 hover:bg-zinc-50">
                Start talking
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader icon={Activity} title="Signal Desk" right={<ArrowRight className="h-4 w-4 text-zinc-400" />} />
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100">
                <Activity className="h-5 w-5 text-zinc-700" />
              </div>
              <h3 className="mt-3 text-[14px] font-semibold text-zinc-900">Live A+ scans, ICT/SMC narration</h3>
              <p className="mt-1 max-w-[260px] text-[12px] text-zinc-500">
                Watch the engine grade the next setup in real time with full trade plan.
              </p>
              <Link to="/signal" className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-800 hover:bg-zinc-50">
                Open desk
              </Link>
            </div>
          </Card>
        </section>

        {/* Workspace tabs + outlet */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-zinc-900">Workspace</h2>
        </div>

        <div className="mt-3 rounded-xl border border-zinc-200 bg-white">
          <nav className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 p-1.5">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              const Icon = t.icon;
              const count = t.countKey ? counts[t.countKey] : undefined;
              return (
                <Link
                  key={t.to}
                  to={t.to as "/dashboard"}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {typeof count === "number" && count > 0 && (
                    <span className={`ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="p-5">
            <Outlet />
          </div>
        </div>

        <div className="h-12" />
      </main>

      <SiteFooter />
    </div>
  );
}
