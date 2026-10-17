import * as React from "react";

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
import {
  CloudAudiences,
  CloudBuildWith,
  CloudHero,
} from "@/components/home/CloudHome";
import { CloudFeatureVideos } from "@/components/home/CloudFeatureVideos";
import { CloudSolutions, CloudLogoStrip, CloudStartBanner } from "@/components/home/CloudSolutions";
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

import { Check, Sparkles, Zap, Crown, Minus, Menu, X, Chrome, MessageSquare, ScanLine, Database, Wifi, Box, Search } from "lucide-react";

import xaiLogo from "@/assets/xai-logo.png";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Gold Trading — Jenvu" },
      {
        name: "description",
        content:
          "Jenvu is an AI trading terminal for live ICT/SMC gold analysis with precise entries, stops, targets and mandatory senior review on eligible plans.",
      },
      { property: "og:title", content: "AI Gold Trading — Jenvu" },
      {
        property: "og:description",
        content: "Analyze XAU/USD charts in TradingView with institutional ICT/SMC logic, chart-aware AI and reviewed trade signals.",
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
            "AI trading terminal with institutional ICT/SMC analysis and reviewed signals for XAU/USD.",
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
    return { tickerRows: null as TickerRow[] | null, board };
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
    const id = setInterval(() => { if (document.visibilityState !== "hidden") void run(); }, 30_000);
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
  
  const xau = ticker.find((r) => r[0] === "XAU/USD");
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
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      {/* NAV — Google Cloud style; keeps the site zoom so the menu size stays the same */}
      <header className="jenvu-home-header sticky top-0 z-50 bg-background">
        <div className="relative flex items-center gap-3 px-4 py-2.5 sm:px-4">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 shrink-0 rounded-md object-contain" />
            <span className="truncate text-[22px] leading-none tracking-tight text-gc-ink" style={{ fontFamily: "\"Google Sans\", \"Product Sans\", \"DM Sans\", system-ui, sans-serif", fontWeight: 500 }}>Jenvu</span>
          </Link>

          <nav className="ml-6 hidden min-w-0 items-center gap-0.5 whitespace-nowrap text-[14px] text-gc-ink-muted lg:flex [&>a]:rounded-md [&>a]:px-2.5 [&>a]:py-2 [&>a:hover]:bg-gc-surface [&>a:hover]:text-gc-ink">
            <Link to="/about">Overview</Link>
            <Link to="/strategies/ict-gold-trading">Solutions</Link>
            <Link to="/ai-engine">Products</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/insights">Resources</Link>
            <Link to="/contact" className="!text-gc-blue">Contact us</Link>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link to="/help" aria-label="Search help" className="hidden h-10 w-10 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-surface md:inline-flex">
              <Search className="h-5 w-5" />
            </Link>
            <div className="hidden items-center whitespace-nowrap text-[14px] md:flex [&>a]:rounded-md [&>a]:px-2.5 [&>a]:py-2 [&>a:hover]:bg-gc-surface">
              <Link to="/help" className="text-gc-ink-muted hover:text-gc-ink">Docs</Link>
              <Link to="/contact" className="text-gc-ink-muted hover:text-gc-ink">Support</Link>
              <Link to="/dashboard" className="text-gc-blue">Console</Link>
            </div>
            {isAuthed ? (
              <Link
                to="/dashboard"
                className="ml-2 inline-flex h-10 items-center justify-center rounded-full bg-gc-blue px-4 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/auth" className="ml-1 hidden whitespace-nowrap rounded-md px-2.5 py-2 text-[14px] text-gc-ink-muted hover:bg-gc-surface hover:text-gc-ink xl:inline-flex">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" } as never}
                  className="ml-2 inline-flex h-10 items-center justify-center rounded-full bg-gc-blue px-4 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover"
                >
                  Start free
                </Link>
              </>
            )}
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-gc-ink hover:bg-gc-surface lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
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
                { to: "/about", label: "Overview" },
                { to: "/strategies/ict-gold-trading", label: "Solutions" },
                { to: "/ai-engine", label: "Products" },
                { to: "/pricing", label: "Pricing" },
                { to: "/insights", label: "Resources" },
                { to: "/help", label: "Docs" },
                { to: "/contact", label: "Contact us" },
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
                  className="mx-3 mt-3 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-50"
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
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-50"
                  >
                    Apply now
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}


      <div className="jenvu-home-content">
        <main>
          <CloudHero price={xau?.[1] ?? "—"} delta={xau?.[2] ?? "…"} />
          <CloudAudiences />
          <CloudBuildWith />
          <CloudFeatureVideos />
          <CloudSolutions />
          <CloudLogoStrip />
          <CloudStartBanner />
        </main>

        <SiteFooter />
      </div>
    </div>
    </>

  );
}

