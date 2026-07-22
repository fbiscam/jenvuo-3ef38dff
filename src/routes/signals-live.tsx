import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useMemo, useState, useEffect } from "react";

import SiteFooter from "@/components/SiteFooter";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import { TrendingUp, TrendingDown, Trophy, Flame, Clock, Filter, RefreshCw, Sparkles, CheckCircle2, XCircle, Circle } from "lucide-react";

type Signal = {
  id: string;
  pair: string;
  direction: string;
  grade: string | null;
  confidence: number | null;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  rr: number | null;
  session: string | null;
  killzone: string | null;
  htf_bias: string | null;
  fired_at: string;
  outcome: "win" | "loss" | "pending" | string;
  realized_r: number | null;
  resolved_at: string | null;
};

type FeedResponse = {
  days: number;
  generated_at: string;
  signals: Signal[];
  stats: {
    total: number; resolved: number; pending: number;
    wins: number; losses: number; win_rate: number; avg_r: number; total_r: number;
    streak: number; streak_kind: "win" | "loss" | null;
  };
  by_pair: { pair: string; total: number; wins: number; losses: number; r: number; win_rate: number }[];
  by_session: { session: string; total: number; wins: number; losses: number; win_rate: number }[];
};

const feedQuery = (days: number) => queryOptions({
  queryKey: ["public-signals-feed", days],
  queryFn: async (): Promise<FeedResponse> => {
    if (typeof window === "undefined") {
      return {
        days,
        generated_at: new Date().toISOString(),
        signals: [],
        stats: { total: 0, resolved: 0, pending: 0, wins: 0, losses: 0, win_rate: 0, avg_r: 0, total_r: 0, streak: 0, streak_kind: null },
        by_pair: [],
        by_session: [],
      };
    }
    const res = await fetch(`/api/public/signals-feed?days=${days}&limit=200`);
    if (!res.ok) throw new Error("feed_failed");
    return res.json();
  },
  staleTime: 30_000,
  refetchInterval: 60_000,
});

export const Route = createFileRoute("/signals-live")({
  head: () => ({
    meta: [
      { title: "Live Signals Feed — Real Trades, Real Results | Jenvu" },
      { name: "description", content: "See every gold signal Jenvu AI has broadcast — live wins, losses, R multiples, and session accuracy. No login required." },
      { property: "og:title", content: "Live Signals Feed — Real Trades, Real Results | Jenvu" },
      { property: "og:description", content: "Public performance log of every Jenvu XAU signal — wins, losses, R multiples, session accuracy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignalsLivePage,
});

function SignalsLivePage() {
  return (
    <div className="min-h-dvh bg-[#FAFAFA] text-zinc-900 antialiased" style={{ fontFamily: '"Google Sans","Product Sans","DM Sans",system-ui,sans-serif' }}>
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 shrink-0 rounded-md object-contain" />
            <span className="truncate text-[22px] tracking-tight leading-none" style={{ color: "#3c4043", fontWeight: 500 }}>Jenvu</span>
          </Link>
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-7 text-sm text-zinc-900">
            <Link to="/signal" className="hover:text-zinc-900">Signal Engine</Link>
            <Link to="/signals-live" className="font-semibold text-emerald-700">Live Feed</Link>
            <Link to="/briefs" className="hover:text-zinc-900">Briefs</Link>
            <Link to="/pricing" className="hover:text-zinc-900">Pricing</Link>
            <Link to="/about" className="hover:text-zinc-900">About</Link>
          </nav>
          <HeaderAuthButtons />
        </div>
      </header>

      <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-16 text-sm text-zinc-500">Loading live feed…</div>}>
        <ClientGate fallback={<div className="mx-auto max-w-6xl px-5 py-16 text-sm text-zinc-500">Loading live feed…</div>}>
          <FeedBody />
        </ClientGate>
      </Suspense>


      <SiteFooter />
    </div>
  );
}

const SIGNALS_START_AT = new Date("2026-07-23T00:00:00Z").getTime();
const PAGE_SIZE = 10;

function ClientGate({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return <>{mounted ? children : fallback}</>;
}


function FeedBody() {
  const [days, setDays] = useState(30);
  const { data, refetch, isFetching } = useSuspenseQuery(feedQuery(days));
  const [pairFilter, setPairFilter] = useState<string>("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "win" | "loss" | "pending">("all");
  const [dirFilter, setDirFilter] = useState<"all" | "BUY" | "SELL">("all");
  const [page, setPage] = useState(1);

  const signals = useMemo(
    () => data.signals.filter((s) => new Date(s.fired_at).getTime() >= SIGNALS_START_AT),
    [data.signals],
  );
  const pairs = useMemo(() => Array.from(new Set(signals.map((s) => s.pair))).sort(), [signals]);

  const filtered = useMemo(() => signals.filter((s) => {
    if (pairFilter !== "ALL" && s.pair !== pairFilter) return false;
    if (outcomeFilter !== "all" && s.outcome !== outcomeFilter) return false;
    if (dirFilter !== "all" && s.direction !== dirFilter) return false;
    return true;
  }), [signals, pairFilter, outcomeFilter, dirFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  // Reset to page 1 whenever filters shrink the list below current page
  if (page !== currentPage) setTimeout(() => setPage(currentPage), 0);

  const bestPair = data.by_pair.find((p) => p.wins + p.losses >= 3) ?? data.by_pair[0];
  const bestSession = data.by_session.find((s) => s.wins + s.losses >= 3) ?? data.by_session[0];

  return (
    <>
      {/* HERO */}
      <section className="border-b border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-7 sm:py-14">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 sm:text-[11px]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live · Public
              </div>
              <h1 className="mt-3 text-[22px] font-semibold tracking-tight leading-[1.15] sm:text-4xl md:text-5xl">
                Every signal. Every outcome.
              </h1>
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-zinc-600 sm:mt-4 sm:text-lg">
                Real-time log of every gold signal broadcast by Jenvu AI — actual win/loss and R multiple auto-resolved from live price. No login, no cherry-picking.
              </p>
            </div>
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${days === d ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"}`}
                >
                  {d}D
                </button>
              ))}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-8">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard
            icon={<Trophy className="h-4 w-4" />}
            label="Win rate"
            value={`${data.stats.win_rate.toFixed(1)}%`}
            hint={`${data.stats.wins}W / ${data.stats.losses}L`}
            accent="emerald"
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Total R"
            value={`${data.stats.total_r >= 0 ? "+" : ""}${data.stats.total_r.toFixed(2)}R`}
            hint={`avg ${data.stats.avg_r >= 0 ? "+" : ""}${data.stats.avg_r.toFixed(2)}R / trade`}
            accent={data.stats.total_r >= 0 ? "emerald" : "rose"}
          />
          <StatCard
            icon={<Flame className="h-4 w-4" />}
            label="Current streak"
            value={data.stats.streak_kind ? `${data.stats.streak} ${data.stats.streak_kind === "win" ? "wins" : "losses"}` : "—"}
            hint={data.stats.streak_kind === "win" ? "In the green" : data.stats.streak_kind === "loss" ? "In drawdown" : "Awaiting"}
            accent={data.stats.streak_kind === "win" ? "emerald" : data.stats.streak_kind === "loss" ? "rose" : "zinc"}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Signals fired"
            value={String(data.stats.total)}
            hint={`${data.stats.resolved} resolved · ${data.stats.pending} live`}
            accent="zinc"
          />
        </div>

        {/* Best pair / session */}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {bestPair && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Top pair</div>
                <div className="font-mono text-xs text-zinc-400">{bestPair.total} trades</div>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <div className="font-mono text-2xl font-bold text-zinc-900">{bestPair.pair}</div>
                <div className="text-sm font-semibold text-emerald-700">{bestPair.win_rate.toFixed(1)}% win</div>
                <div className={`text-sm font-mono ${bestPair.r >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{bestPair.r >= 0 ? "+" : ""}{bestPair.r.toFixed(2)}R</div>
              </div>
            </div>
          )}
          {bestSession && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Best session</div>
                <div className="font-mono text-xs text-zinc-400">{bestSession.total} trades</div>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <div className="text-2xl font-bold text-zinc-900">{bestSession.session}</div>
                <div className="text-sm font-semibold text-emerald-700">{bestSession.win_rate.toFixed(1)}% win</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FILTERS */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 sm:p-4">
          <div className="-mx-0.5 flex items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
            <div className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-[11px]">
              <Filter className="h-3.5 w-3.5" /> Filters
            </div>
            <select value={pairFilter} onChange={(e) => setPairFilter(e.target.value)} className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700">
              <option value="ALL">All pairs</option>
              {pairs.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="shrink-0 inline-flex rounded-lg border border-zinc-200 p-0.5">
              {(["all", "BUY", "SELL"] as const).map((d) => (
                <button key={d} onClick={() => setDirFilter(d)} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${dirFilter === d ? (d === "BUY" ? "bg-emerald-600 text-white" : d === "SELL" ? "bg-rose-600 text-white" : "bg-zinc-900 text-white") : "text-zinc-600 hover:text-zinc-900"}`}>
                  {d === "all" ? "Both" : d}
                </button>
              ))}
            </div>
            <div className="shrink-0 inline-flex rounded-lg border border-zinc-200 p-0.5">
              {(["all", "win", "loss", "pending"] as const).map((o) => (
                <button key={o} onClick={() => setOutcomeFilter(o)} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize ${outcomeFilter === o ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"}`}>
                  {o}
                </button>
              ))}
            </div>
            <div className="ml-auto shrink-0 text-[11px] text-zinc-500">
              <span className="font-mono text-zinc-900">{filtered.length}</span>/{signals.length}
            </div>
          </div>
        </div>
      </section>

      {/* SIGNAL LIST */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
            No signals yet. New signals will appear here as they fire.
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((s) => <SignalCard key={s.id} s={s} />)}
            </ul>
            {totalPages > 1 && (
              <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`min-w-[32px] rounded-full px-3 py-1.5 text-xs font-medium ${
                      n === currentPage
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <span className="ml-2 text-[11px] text-zinc-500">
                  Page {currentPage} of {totalPages} · {filtered.length} signals
                </span>
              </nav>
            )}
          </>
        )}
        <p className="mt-6 text-center text-[11px] text-zinc-400">
          Auto-updated every 60s · Generated {new Date(data.generated_at).toLocaleString()} · Educational data only, not financial advice.
        </p>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Want these signals the moment they fire?</h2>
          <p className="mt-2 text-sm text-zinc-600">Sign in to Jenvu, upgrade a plan, and get alerts via email, browser, and Telegram.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link to="/pricing" className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">See pricing</Link>
            <Link to="/auth" className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:border-zinc-400">Sign in</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function StatCard({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint: string; accent: "emerald" | "rose" | "zinc" }) {
  const ac = accent === "emerald" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : accent === "rose" ? "text-rose-700 bg-rose-50 border-rose-200" : "text-zinc-700 bg-zinc-50 border-zinc-200";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ac}`}>
        {icon} {label}
      </div>
      <div className="mt-2.5 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{value}</div>
      <div className="mt-1 text-[11px] text-zinc-500">{hint}</div>
    </div>
  );
}

function SignalCard({ s }: { s: Signal }) {
  const isBuy = s.direction === "BUY";
  const isWin = s.outcome === "win";
  const isLoss = s.outcome === "loss";
  const pending = s.outcome === "pending";
  const OutcomeIcon = isWin ? CheckCircle2 : isLoss ? XCircle : Circle;
  const outcomeClass = isWin ? "text-emerald-700 bg-emerald-50 border-emerald-200" : isLoss ? "text-rose-700 bg-rose-50 border-rose-200" : "text-zinc-500 bg-zinc-50 border-zinc-200";
  const fired = new Date(s.fired_at);
  return (
    <li className={`group relative flex flex-col rounded-2xl border bg-white p-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(0,0,0,0.15)] ${isWin ? "border-emerald-200" : isLoss ? "border-rose-200" : "border-zinc-200"}`}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
          <span className={`shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${isBuy ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {isBuy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {s.direction}
          </span>
          <span className="shrink-0 font-mono text-sm font-semibold text-zinc-900">{s.pair}</span>
          {s.grade && <span className="shrink-0 rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">{s.grade}</span>}
          <span className="shrink-0 text-[10px] font-semibold text-zinc-500">{s.confidence ?? "—"}%</span>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${outcomeClass}`}>
          <OutcomeIcon className="h-3 w-3" />
          {pending ? "Live" : s.outcome}
        </span>
      </header>

      <dl className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        {([
          ["Entry", s.entry, "text-zinc-800"],
          ["SL", s.sl, "text-rose-600"],
          ["TP", s.tp, "text-emerald-600"],
          ["RR", s.rr ? `${Number(s.rr).toFixed(1)}` : "—", "text-zinc-800"],
        ] as const).map(([k, v, c]) => (
          <div key={k} className="min-w-0 rounded-md bg-zinc-50 px-1 py-1.5 ring-1 ring-inset ring-zinc-200/70">
            <dt className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">{k}</dt>
            <dd className={`mt-0.5 font-mono text-[11px] truncate ${c}`}>{v ?? "—"}</dd>
          </div>
        ))}
      </dl>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-1.5 text-zinc-500">
          {s.session && <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700">{s.session}</span>}
          {s.killzone && <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700">{s.killzone}</span>}
        </div>
        <div className="flex items-center gap-2">
          {s.realized_r !== null && s.realized_r !== undefined && (
            <span className={`font-mono font-semibold ${Number(s.realized_r) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {Number(s.realized_r) >= 0 ? "+" : ""}{Number(s.realized_r).toFixed(2)}R
            </span>
          )}
          <span className="font-mono text-[10px] text-zinc-400">{relativeTime(fired)}</span>
        </div>
      </footer>
    </li>
  );
}

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
