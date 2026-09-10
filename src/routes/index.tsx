import * as React from "react";
{/* Build a Chrome extension that integrates with my existing ICT/SMC analysis workflow and runs on TradingView pages. */}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import SiteFooter from "@/components/SiteFooter";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";


import { useAuthUser } from "@/hooks/useAuthUser";
import { useTrial } from "@/hooks/useTrial";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { useUpgradeLock } from "@/hooks/useUpgradeLock";
import { getMarketSnapshotsBatch } from "@/lib/gold-analysis.functions";


import RegionEarth from "@/components/RegionEarth";
import TrustedDesks from "@/components/TrustedDesks";
import { WhyJenvu } from "@/components/WhyJenvu";
import CloudflareHero from "@/components/CloudflareHero";
import TailoredToDesk from "@/components/TailoredToDesk";

import {
  getCorrelatedMarkets,
  type CorrelatedBoard,
  type CorrelatedMarket,
} from "@/lib/correlated-markets.functions";

/* Neutral skeleton rows shown until the live macro feed hydrates. */
const CORR_PLACEHOLDER: CorrelatedMarket[] = [
  { symbol: "DXY", display: "DXY", note: "USD strength — inverse driver" },
  { symbol: "US10Y", display: "US10Y", note: "Real yields — inverse driver" },
  { symbol: "XAGUSD", display: "XAG/USD", note: "Silver beta — confirms metals" },
  { symbol: "EURUSD", display: "EUR/USD", note: "USD leg — positive driver" },
  { symbol: "USDJPY", display: "USD/JPY", note: "Carry / risk — inverse driver" },
  { symbol: "SPX", display: "S&P 500", note: "Risk appetite — rotation cue" },
  { symbol: "WTI", display: "WTI Oil", note: "Inflation impulse — positive" },
].map((m) => ({
  ...m,
  price: 0,
  decimals: 2,
  changePct: 0,
  high: 0,
  low: 0,
  rangePos: 50,
  series: [],
  correlation: 0,
  impact: "neutral" as const,
}));

/* ---------- hero background banners (desktop / tablet only) ---------- */
function HeroBanners() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden md:block overflow-hidden">
      {/* Right side candlestick chart panel */}
      <div className="absolute right-0 top-0 h-full w-[32%] max-w-[420px] border-l border-zinc-100/80 bg-gradient-to-l from-zinc-50/90 via-zinc-50/50 to-transparent">
        <svg className="absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-300" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Candlesticks */}
          <g>
            {/* Bullish */}
            <g className="text-emerald-600">
              <rect x="12%" y="62%" width="3%" height="12%" fill="currentColor" />
              <line x1="13.5%" y1="58%" x2="13.5%" y2="78%" stroke="currentColor" strokeWidth="1" />
            </g>
            {/* Bearish */}
            <g className="text-red-600">
              <rect x="26%" y="55%" width="3%" height="9%" fill="currentColor" />
              <line x1="27.5%" y1="50%" x2="27.5%" y2="70%" stroke="currentColor" strokeWidth="1" />
            </g>
            {/* Bullish */}
            <g className="text-emerald-600">
              <rect x="40%" y="48%" width="3%" height="14%" fill="currentColor" />
              <line x1="41.5%" y1="44%" x2="41.5%" y2="68%" stroke="currentColor" strokeWidth="1" />
            </g>
            {/* Bearish */}
            <g className="text-red-600">
              <rect x="54%" y="38%" width="3%" height="10%" fill="currentColor" />
              <line x1="55.5%" y1="35%" x2="55.5%" y2="52%" stroke="currentColor" strokeWidth="1" />
            </g>
            {/* Bullish */}
            <g className="text-emerald-600">
              <rect x="68%" y="30%" width="3%" height="11%" fill="currentColor" />
              <line x1="69.5%" y1="25%" x2="69.5%" y2="46%" stroke="currentColor" strokeWidth="1" />
            </g>
            {/* Bearish */}
            <g className="text-red-600">
              <rect x="82%" y="22%" width="3%" height="9%" fill="currentColor" />
              <line x1="83.5%" y1="18%" x2="83.5%" y2="35%" stroke="currentColor" strokeWidth="1" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

import { Check, Sparkles, Zap, Crown, Minus, Menu, X, Mic, AudioWaveform, PhoneCall, Database, Wifi, Box } from "lucide-react";

import xaiLogo from "@/assets/xai-logo.png";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voice Powered Gold Trading Intelligence" },
      {
        name: "description",
        content:
          "Jenvu AI — voice-native gold trading desk narrating live ICT/SMC A+ setups with precision entries, stops and targets across every XAU cross-pair.",
      },
      { property: "og:title", content: "Voice-Native Gold Trading Intelligence — Jenvu" },
      {
        property: "og:description",
        content: "Speak. Analyze. Execute. The voice terminal that narrates institutional-grade XAU signals across every major gold cross-pair.",
      },
      { property: "og:url", content: "https://jenvu.com/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Jenvu AI",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          description:
            "Voice-native AI gold trading terminal with institutional ICT/SMC analysis for every XAU cross-pair.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),

  // Keep SSR independent from third-party market feeds. Live prices hydrate
  // after first paint, so a slow provider can never prevent the page loading.
  // The XAU projection is primed server-side (5-min cache) so the very first
  // paint shows the real live price instead of a stale placeholder.
  loader: async () => {
    const board = await getCorrelatedMarkets().catch(() => null);
    return { tickerRows: INITIAL_TICKER, board };
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-sm text-zinc-600">{(error as Error)?.message ?? "Something went wrong."}</div>
  ),
  component: HomePage,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

/* ---------- mock data ---------- */
const SIGNALS = [
  { pair: "XAUUSD", t: "14:20:02", tag: "SWEEP", note: "Liquidity grab on London high", tone: "ink" },
  { pair: "XAUUSD", t: "14:18:45", tag: "FVG", note: "Fair Value Gap mitigated", tone: "green" },
  { pair: "XAUUSD", t: "14:15:10", tag: "BOS", note: "Break of structure confirmed", tone: "muted" },
  { pair: "XAUUSD", t: "14:11:32", tag: "OB", note: "Bullish order block tap", tone: "ink" },
] as const;

type TickerRow = [string, string, string];
const INITIAL_TICKER: TickerRow[] = [
  ["XAU/USD", "—", "…"],
  ["DXY", "—", "…"],
  ["US10Y", "—", "…"],
  ["XAG/USD", "—", "…"],
  ["EUR/USD", "—", "…"],
  ["USD/JPY", "—", "…"],
  ["S&P 500", "—", "…"],
  ["WTI Oil", "—", "…"],
];


// Server-fn symbol map — routes through getMarketSnapshot to bypass browser
// CORS restrictions on Yahoo Finance and return authoritative live prices.
const SYMBOL_MAP: Record<string, string> = {
  "XAU/USD": "XAUUSD",
  "DXY": "DXY",
  "US10Y": "US10Y",
  "XAG/USD": "XAGUSD",
  "EUR/USD": "EURUSD",
  "USD/JPY": "USDJPY",
  "S&P 500": "SPX",
  "WTI Oil": "WTI",
};



function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

const TICKER_CACHE_KEY = "jenvu:ticker:v1";

function snapshotsToRows(
  results: Array<{ symbol: string; snapshot: { price: number; changePct: number | null } | null }>,
  prev: TickerRow[],
): TickerRow[] {
  const bySym = new Map(
    results
      .filter((r) => r.snapshot && Number.isFinite(r.snapshot.price))
      .map((r) => [r.symbol, r.snapshot!]),
  );
  return prev.map(([label, price, delta]) => {
    const sym = SYMBOL_MAP[label];
    const d = sym ? bySym.get(sym) : undefined;
    if (!d) return [label, price, delta] as TickerRow;
    const sign = (d.changePct ?? 0) >= 0 ? "+" : "";
    const deltaOut = d.changePct == null ? delta : `${sign}${d.changePct.toFixed(2)}%`;
    return [label, fmtPrice(d.price), deltaOut] as TickerRow;
  });
}

function useLiveTicker(): TickerRow[] {
  const loaderData = Route.useLoaderData() as { tickerRows?: TickerRow[] } | undefined;
  const [rows, setRows] = React.useState<TickerRow[]>(
    loaderData?.tickerRows?.length ? loaderData.tickerRows : INITIAL_TICKER,
  );
  const fetchBatch = useServerFn(getMarketSnapshotsBatch);

  // Instant paint on repeat visits / client navigations.
  React.useEffect(() => {
    if (loaderData?.tickerRows?.length) return;
    try {
      const raw = sessionStorage.getItem(TICKER_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TickerRow[];
        if (Array.isArray(parsed) && parsed.length) setRows(parsed);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    let alive = true;
    const symbols = INITIAL_TICKER
      .map(([label]) => SYMBOL_MAP[label])
      .filter((s): s is string => !!s);

    const fetchPrices = async () => {
      try {
        const res = await fetchBatch({ data: { symbols } });
        if (!alive || !res?.results) return;
        setRows((prev) => {
          const next = snapshotsToRows(res.results, prev);
          try { sessionStorage.setItem(TICKER_CACHE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
      } catch {
        /* ignore */
      }
    };
    // One refresh per minute is sufficient for the compact homepage ticker and
    // avoids exhausting the server runtime's outbound connection limit.
    fetchPrices();
    const id = setInterval(fetchPrices, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return rows;
}




/* ---------- atoms ---------- */
function TagPill({ tag, tone }: { tag: string; tone: "ink" | "green" | "muted" }) {
  const cls =
    tone === "green"
      ? "bg-emerald-500 text-white"
      : tone === "muted"
      ? "bg-zinc-200 text-zinc-900"
      : "bg-zinc-900 text-white";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${MONO} uppercase tracking-wider ${cls}`}>
      {tag}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 ${MONO} text-[10px] tracking-[0.22em] uppercase text-zinc-900`}>
      <span className="h-px w-6 bg-zinc-300" />
      {children}
    </div>
  );
}

/* Live macro board: markets that materially move the XAU/USD price. */
function useCorrelatedMarkets(initial: CorrelatedBoard | null): CorrelatedBoard | null {
  const [data, setData] = React.useState<CorrelatedBoard | null>(initial);
  const fetchBoard = useServerFn(getCorrelatedMarkets);

  React.useEffect(() => {
    let alive = true;
    let inFlight = false;
    const run = async () => {
      if (inFlight) return; // never stack requests on the 5s tick
      inFlight = true;
      try {
        const res = await fetchBoard();
        if (alive && res) setData(res as CorrelatedBoard);
      } catch { /* keep last known values */ } finally { inFlight = false; }
    };
    run();
    const id = setInterval(run, 5_000);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return data;
}

/* Tiny low/high sparkline for one correlated market row. */
function Sparkline({ series, up }: { series: number[]; up: boolean }) {
  if (!series || series.length < 3) {
    return <div className="h-8 w-full rounded bg-zinc-50" />;
  }
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const span = hi - lo || 1;
  const W = 120;
  const H = 32;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - 3 - ((v - lo) / span) * (H - 6);
    return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
  });
  const stroke = up ? "#10b981" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-[110px]" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={`0,${H} ${pts.join(" ")} ${W},${H}`}
        fill={up ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)"}
        stroke="none"
      />
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={W} cy={pts[pts.length - 1].split(",")[1]} r="2" fill={stroke} />
    </svg>
  );
}

function HomePage() {
  const ticker = useLiveTicker();
  
  const board = useCorrelatedMarkets(
    (Route.useLoaderData() as { board?: CorrelatedBoard | null } | undefined)?.board ?? null,
  );
  const currentPlan = useCurrentPlan();
  const upgradeLock = useUpgradeLock();
  const trial = useTrial();
  const { user: authUser } = useAuthUser();
  const isAuthed = !!authUser;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  React.useEffect(() => {
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileMenuOpen]);
  return (
    <>
    <div className={`jenvu-zoom min-h-dvh w-full bg-white text-zinc-900 ${SANS} antialiased selection:bg-zinc-900 selection:text-white`}>
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 shrink-0 rounded-md object-contain" />
            <span className="truncate text-[22px] tracking-tight leading-none" style={{ color: "#3c4043", fontFamily: "\"Google Sans\", \"Product Sans\", \"DM Sans\", system-ui, sans-serif", fontWeight: 500 }}>Jenvu</span>
          </Link>

          <nav className={`hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-7 text-sm text-zinc-900`}>
            <Link to="/pricing" className="hover:text-zinc-900">Pricing</Link>
            <Link to="/founding" className="hover:text-zinc-900">Founding</Link>
            <Link to="/insights" className="hover:text-zinc-900">Insights</Link>
            <Link to="/contact" className="hover:text-zinc-900">Contact</Link>

          </nav>
          <div className="flex items-center gap-2">
            <div className={isAuthed ? "" : "hidden md:block"}>
              <HeaderAuthButtons />
            </div>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>


        </div>

      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-x-0 top-0 bg-white border-b border-zinc-100 shadow-lg">
            <div className="flex items-center justify-between px-5 py-3">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
                <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 rounded-md object-contain" />
                <span className="text-[20px] tracking-tight" style={{ color: "#3c4043", fontFamily: "\"Google Sans\",\"Product Sans\",\"DM Sans\",system-ui,sans-serif", fontWeight: 500 }}>Jenvu</span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col px-3 pb-4 pt-1 text-[15px] text-zinc-900">
              {[
                { to: "/pricing", label: "Pricing" },
                { to: "/founding", label: "Founding" },
                { to: "/insights", label: "Insights" },
                { to: "/contact", label: "Contact" },
              ].map((it) => (

                <Link
                  key={it.to}
                  to={it.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-3 hover:bg-zinc-50"
                >
                  {it.label}
                </Link>
              ))}
              {isAuthed ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mx-3 mt-3 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Dashboard
                  <span className={`${MONO} text-[10px] opacity-70 ml-1.5`}>↗</span>
                </Link>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 px-3">
                  <Link
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/founding"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Apply
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}


      <main>
      {/* HERO */}
      <CloudflareHero />






      {/* REGION: EARTH */}
      <section className="border-t border-zinc-100">
        <RegionEarth />
      </section>


      {/* TRUSTED DESKS / REVIEWS */}
      <section className="border-t border-zinc-100 bg-white">
        <TrustedDesks />
      </section>

      {/* WHY JENVU — Cloudflare-style split panel */}
      <section className="border-t border-zinc-100 bg-white">
        <WhyJenvu />
      </section>


      {/* PRICING — Free vs Paid panels */}
      <section className="border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl md:text-[44px] md:leading-[1.1]">
              Compare Jenvu Plans
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-500 sm:text-base">
              Choose the wallet and desk access that fits how you trade gold.
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Wallet & Credits", "Signal Engine", "API & Extension"].map((t, i) => (
              <span
                key={t}
                className={`rounded-full border px-4 py-1.5 text-[13px] font-medium ${
                  i === 0
                    ? "border-home-accent bg-home-accent-soft text-home-accent"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
              >
                {t}
              </span>
            ))}
          </div>

          {/* Trial vs Paid explainer */}
          <div className="mx-auto mt-12 grid max-w-4xl items-center gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                Free Trial vs. Paid Plans
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-zinc-500">
                Paid plans unlock realtime A+ signals, unlimited voice queries,
                and API keys for the browser extension.
              </p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="flex h-24 w-28 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <span className={`${MONO} text-[10px] uppercase tracking-wider text-zinc-400`}>Trial</span>
                <span className="mt-1 text-lg font-semibold text-zinc-900">$0</span>
              </div>
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none" aria-hidden>
                <line x1="2" y1="12" x2="40" y2="12" stroke="currentColor" strokeWidth="2" className="text-home-accent" strokeDasharray="4 4" />
                <path d="M36 5l8 7-8 7" stroke="currentColor" strokeWidth="2" fill="none" className="text-home-accent" />
              </svg>
              <div className="flex h-24 w-28 flex-col items-center justify-center rounded-xl border-2 border-home-accent bg-home-accent-soft">
                <span className={`${MONO} text-[10px] uppercase tracking-wider text-home-accent`}>Paid</span>
                <span className="mt-1 text-lg font-semibold text-zinc-900">$15+</span>
              </div>
            </div>
          </div>

          {/* Free / Paid panels */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-7">
              <h4 className="text-lg font-semibold text-zinc-900">Free</h4>
              <p className="mt-1 text-[13px] text-zinc-500">30-day trial for every new desk</p>
              <div className="mt-5 space-y-3">
                {[
                  ["Signals / day", "5"],
                  ["Signal latency", "15 min"],
                  ["Voice queries", "20 / day"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg border border-dashed border-zinc-300 px-4 py-2.5">
                    <span className="text-[13px] text-zinc-600">{k}</span>
                    <span className={`${MONO} text-[13px] font-semibold text-zinc-900`}>{v}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/founding"
                className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                See more
              </Link>
            </div>

            {/* Paid */}
            <div className="rounded-2xl border-2 border-home-accent bg-home-accent-soft/40 p-7">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold text-zinc-900">Paid</h4>
                <span className={`${MONO} rounded-sm bg-home-accent px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white`}>
                  Popular
                </span>
              </div>
              <p className="mt-1 text-[13px] text-zinc-500">Pro, Elite and Ultra wallet tiers</p>
              <div className="mt-5 space-y-3">
                {[
                  ["Signals / day", "Unlimited"],
                  ["Signal latency", "Realtime"],
                  ["Voice queries", "Unlimited"],
                  ["API & Extension", "Included"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg border border-dashed border-home-accent/50 bg-white px-4 py-2.5">
                    <span className="text-[13px] text-zinc-600">{k}</span>
                    <span className={`${MONO} text-[13px] font-semibold text-home-accent`}>{v}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/pricing"
                className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-full bg-home-accent text-sm font-semibold text-white transition hover:opacity-90"
              >
                See more
              </Link>
            </div>
          </div>
        </div>
      </section>




      {/* TAILORED TO YOUR DESK */}
      <TailoredToDesk />



      {/* INTEGRATIONS */}
      <section className="border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="text-left md:text-left">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                Wired into the venues&nbsp;
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["OANDA XAU feeds", "Yahoo Finance", "LBMA fix", "TradingView", "COMEX / COT", "DXY"].map((n) => (
                <span
                  key={n}
                  className={`rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 ${MONO} text-[11px] tracking-wider text-zinc-900`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>





      <section className="overflow-hidden border-t border-border bg-background">
        <div className="mx-auto max-w-[1200px] px-3 pb-24 pt-10 sm:px-4">
          <div className="build-boundaries-panel relative min-h-[396px] overflow-hidden rounded-[14px] bg-home-accent">
            {/* dot grid */}
            <div className="build-boundaries-dots pointer-events-none absolute inset-0" />
            {/* warm bottom glow */}
            <div className="build-boundaries-glow pointer-events-none absolute bottom-0 left-1/2 h-2/3 w-3/4 -translate-x-1/2 translate-y-1/3" />

            {/* floating dashed tiles */}
            {[
              { Icon: Mic, cls: "left-[14%] top-[8%] rotate-12", delay: "0s" },
              { Icon: AudioWaveform, cls: "left-[8%] top-[27%] -rotate-6", delay: "0.8s" },
              { Icon: PhoneCall, cls: "left-[21%] top-[32%] -rotate-12", delay: "1.6s" },
              { Icon: Database, cls: "right-[22%] top-[28%] rotate-6", delay: "0.4s" },
              { Icon: Wifi, cls: "right-[8%] top-[9%] rotate-12", delay: "1.2s" },
              { Icon: Box, cls: "right-[5%] top-[35%] -rotate-12", delay: "2s" },
            ].map(({ Icon, cls, delay }, i) => (
              <div
                key={i}
                className={`pointer-events-none absolute hidden h-14 w-14 items-center justify-center rounded-sm border border-primary-foreground/60 sm:flex ${cls}`}
                style={{ animation: `cfhero-float 7s ease-in-out ${delay} infinite` }}
              >
                <Icon className="h-5 w-5 text-home-accent-foreground" strokeWidth={1.75} />
              </div>
            ))}

            {/* content */}
            <div className="relative z-10 mx-auto max-w-3xl px-5 pb-24 pt-16 text-center sm:px-10 sm:pt-24">
              <h2 className="mx-auto max-w-[330px] text-[30px] font-semibold leading-[1.08] text-home-accent-foreground sm:max-w-none sm:text-4xl md:text-[42px]">
                Build without boundaries
              </h2>
              <p className="mx-auto mt-6 max-w-[320px] text-[13px] leading-[1.45] text-home-accent-foreground sm:max-w-xl sm:text-sm sm:leading-snug">
                Your voice agent is one tap away — listening, reasoning, research
                <br className="hidden sm:block" />{" "}
                &amp; narrating. Speak to the market now, no credit card required.
              </p>
              <div className="mx-auto mt-8 flex w-full max-w-[300px] flex-col items-stretch justify-center gap-2 sm:max-w-none sm:flex-row sm:items-center">
                <Link
                  to="/dashboard"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-background px-6 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                >
                  Open Dashboard
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary-foreground/15 px-6 text-sm font-semibold text-home-accent-foreground backdrop-blur transition hover:bg-primary-foreground/25"
                >
                  View Pricing
                </Link>
              </div>
            </div>


            {/* ticker bar */}
            <div className="absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-primary-foreground/25 bg-foreground/10 py-3">
              <div className="flex w-max items-center gap-10 whitespace-nowrap" style={{ animation: "jenvu-marquee 28s linear infinite" }}>
                {Array.from({ length: 2 }).map((_, dup) => (
                  <div key={dup} className="flex items-center gap-10 pr-10 text-xs font-medium text-home-accent-foreground">
                    <span>◈ Voice agent listening &amp; narrating the market 24/7</span>
                    <span>◉ Real-time gold signals without surprises</span>
                    <span>⌁ Research, reasoning &amp; risk context in one terminal</span>
                    <span>▣ Battle-tested feeds powering desks worldwide</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      <SiteFooter />
    </div>
    </>

  );
}

