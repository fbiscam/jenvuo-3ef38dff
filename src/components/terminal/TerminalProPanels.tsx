import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Info, Newspaper, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { listNotifications, type NotificationRow } from "@/lib/notifications.functions";
import type { NewsEvent } from "@/lib/news.functions";
import type { PerfPoint, Technicals } from "@/lib/chart/market-stats";

/** Live chart facts the Terminal side panels show (all derived from the chart feed). */
export type MarketSnapshot = {
  price: number;
  diff: number;
  pct: number;
  high: number;
  low: number;
  /** Recent closes (oldest first) for the small trend lines. */
  spark: number[];
  trend: string;
  zones: Array<{ type: "SUPPLY" | "DEMAND"; top: number; bottom: number; strength: number }>;
  /** % change over the look-back windows the loaded candles cover. */
  perf: PerfPoint[];
  /** Rule-based technical read of the current timeframe. */
  technicals: Technicals;
};

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n: number, digits = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;

/* ---------------- Sessions (UTC) ---------------- */

const SESSIONS = [
  { key: "Sydney", start: 21, end: 6, note: "Quiet Asia-Pacific open" },
  { key: "Tokyo", start: 0, end: 9, note: "Asia range building" },
  { key: "London", start: 7, end: 16, note: "Higher liquidity and volatility" },
  { key: "New York", start: 12, end: 21, note: "US data and London overlap" },
] as const;

function inSession(hour: number, s: (typeof SESSIONS)[number]) {
  return s.start < s.end ? hour >= s.start && hour < s.end : hour >= s.start || hour < s.end;
}

function useUtcNow(stepMs = 30_000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => window.clearInterval(id);
  }, [stepMs]);
  return now;
}

export function activeSession(now: number | null, marketClosed: boolean) {
  if (now == null) return null;
  if (marketClosed) return { key: "Closed", note: "Gold reopens Sunday 22:00 UTC", start: 0, end: 0 };
  const hour = new Date(now).getUTCHours();
  const live = SESSIONS.filter((s) => inSession(hour, s));
  // The most recently opened session leads (e.g. New York during the London overlap).
  return live.sort((a, b) => ((hour - b.start + 24) % 24) - ((hour - a.start + 24) % 24))[0] ?? null;
}

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

/* ---------------- Shared card bits ---------------- */

const panel = "rounded-xl border border-gc-line bg-background p-4 shadow-sm";

function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-[13px] font-medium tracking-wide text-gc-ink">{children}</h2>
      {right && <div className="ml-auto flex items-center gap-1.5">{right}</div>}
    </div>
  );
}

function newsCountdown(nextNews: NewsEvent | undefined, now: number | null) {
  if (!nextNews || now == null) return null;
  const mins = Math.round((new Date(nextNews.date).getTime() - now) / 60_000);
  if (mins <= 0) return "now";
  if (mins >= 1440) return `in ${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  if (mins >= 60) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `in ${mins}m`;
}

/* ---------------- Asset detail ---------------- */

export function AssetDetailCard({
  market,
  nextNews,
  marketClosed,
}: {
  market: MarketSnapshot | null;
  nextNews?: NewsEvent;
  marketClosed: boolean;
}) {
  const now = useUtcNow();
  const up = (market?.diff ?? 0) >= 0;
  const countdown = newsCountdown(nextNews, now);
  return (
    <section className={panel} aria-label="XAU/USD details">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gc-yellow-soft text-[11px] font-semibold text-gc-yellow">Au</span>
        <div className="min-w-0 leading-tight">
          <p className="text-[14px] font-medium text-gc-ink">XAU/USD</p>
          <p className="truncate text-[11px] text-gc-ink-muted">Gold spot · U.S. dollar</p>
        </div>
        <span
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
            marketClosed ? "bg-gc-panel text-gc-ink-muted" : "bg-gc-green-soft text-gc-success",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", marketClosed ? "bg-gc-ink-muted" : "bg-gc-success")} aria-hidden="true" />
          {marketClosed ? "Closed" : "Live"}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-[30px] font-semibold leading-none tabular-nums text-gc-ink">{market ? fmt(market.price) : "—"}</span>
        <span className="text-[11px] text-gc-ink-muted">USD</span>
      </div>
      <p className={cn("mt-1.5 text-[12px] font-medium tabular-nums", up ? "text-gc-success" : "text-gc-red")}>
        {market ? `${signed(market.diff)} (${signed(market.pct)}%) · 24h` : "Waiting for live candles…"}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gc-line pt-3 text-[11px]">
        {[
          ["24h high", market ? fmt(market.high) : "—"],
          ["24h low", market ? fmt(market.low) : "—"],
          ["Range", market ? fmt(market.high - market.low) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <p className="text-gc-ink-muted">{k}</p>
            <p className="mt-0.5 truncate text-[12px] tabular-nums text-gc-ink">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-gc-panel px-2.5 py-2 text-[11px]">
        <Newspaper
          className={cn("h-3.5 w-3.5 shrink-0", nextNews?.impact === "High" ? "text-gc-red" : nextNews ? "text-gc-yellow" : "text-gc-ink-muted")}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-gc-ink" title={nextNews?.title}>
          {nextNews ? `${nextNews.country} ${nextNews.title}` : "No important news ahead"}
        </span>
        {countdown && <span className="shrink-0 tabular-nums text-gc-ink-muted">{countdown}</span>}
      </div>
    </section>
  );
}

/* ---------------- Performance ---------------- */

export function PerformanceCard({ market }: { market: MarketSnapshot | null }) {
  const perf = market?.perf ?? [];
  const max = Math.max(0.01, ...perf.map((p) => Math.abs(p.pct)));
  return (
    <section className={panel} aria-label="Performance">
      <CardTitle right={<span className="text-[10px] text-gc-ink-muted">From loaded candles</span>}>Performance</CardTitle>
      {perf.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-gc-ink-muted">Not enough history on this timeframe.</p>
      ) : (
        <div className="mt-3 flex h-[104px] items-stretch gap-2">
          {perf.map((p) => {
            const up = p.pct >= 0;
            const h = Math.max(6, (Math.abs(p.pct) / max) * 100);
            return (
              <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${p.label}: ${signed(p.pct)}%`}>
                <span className={cn("text-[9.5px] tabular-nums", up ? "text-gc-success" : "text-gc-red")}>{signed(p.pct)}%</span>
                <div className="flex w-full flex-1 items-end">
                  <span
                    className={cn("w-full rounded-t-[3px]", up ? "bg-gc-success" : "bg-gc-red")}
                    style={{ height: `${h}%`, opacity: 0.9 }}
                  />
                </div>
                <span className="text-[10px] text-gc-ink-muted">{p.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ---------------- Technicals gauge ---------------- */

const RATINGS = ["Strong sell", "Sell", "Neutral", "Buy", "Strong buy"] as const;

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos((Math.PI * a) / 180), cy - r * Math.sin((Math.PI * a) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

export function TechnicalsCard({ market }: { market: MarketSnapshot | null }) {
  const t = market?.technicals;
  const score = t?.score ?? 0;
  const angle = 180 - ((score + 1) / 2) * 180;
  const nx = 100 + 62 * Math.cos((Math.PI * angle) / 180);
  const ny = 96 - 62 * Math.sin((Math.PI * angle) / 180);
  const tone = !t ? "text-gc-ink-muted" : score <= -0.2 ? "text-gc-red" : score >= 0.2 ? "text-gc-success" : "text-gc-ink";
  const segColor = ["var(--gc-red)", "color-mix(in srgb, var(--gc-red) 55%, transparent)", "var(--gc-ink-muted)", "color-mix(in srgb, var(--gc-success) 55%, transparent)", "var(--gc-success)"];
  return (
    <section className={panel} aria-label="Technicals">
      <CardTitle right={<span className="text-[10px] text-gc-ink-muted">Rule-based</span>}>Technicals</CardTitle>
      <svg viewBox="0 0 200 112" className="mx-auto mt-1 block h-[112px] w-full max-w-[240px]" aria-hidden="true">
        {RATINGS.map((_, i) => (
          <path key={i} d={arc(100, 96, 72, 180 - i * 36 - 2, 180 - (i + 1) * 36 + 2)} stroke={segColor[i]} strokeWidth="9" fill="none" strokeLinecap="round" />
        ))}
        {t && (
          <>
            <line x1="100" y1="96" x2={nx} y2={ny} stroke="var(--gc-ink)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="96" r="5" fill="var(--gc-ink)" />
          </>
        )}
        <text x="22" y="110" fontSize="9" fill="var(--gc-ink-muted)" textAnchor="middle">Sell</text>
        <text x="178" y="110" fontSize="9" fill="var(--gc-ink-muted)" textAnchor="middle">Buy</text>
      </svg>
      <p className={cn("-mt-1 text-center text-[15px] font-semibold", tone)}>{t ? t.rating : "—"}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gc-line pt-3 text-center text-[11px]">
        {[
          ["RSI 14", t?.rsi != null ? t.rsi.toFixed(1) : "—"],
          ["SMA 20", t?.sma20 != null ? fmt(t.sma20) : "—"],
          ["SMA 50", t?.sma50 != null ? fmt(t.sma50) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <p className="text-gc-ink-muted">{k}</p>
            <p className="mt-0.5 truncate text-[12px] tabular-nums text-gc-ink">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-gc-ink-muted">Price vs SMA 20/50, RSI and Jenvu structure on this timeframe. Not financial advice.</p>
    </section>
  );
}

/* ---------------- Floating market summary (over the chart) ---------------- */

export function MarketOverlayCard({ market, onClose, children }: { market: MarketSnapshot | null; onClose: () => void; children?: ReactNode }) {
  if (!market) return null;
  const up = market.diff >= 0;
  return (
    <div className="terminal-glass w-[264px] rounded-xl border border-gc-line p-3.5 shadow-lg">
      <div className="flex items-center gap-2">
        <p className="text-[12.5px] font-medium text-gc-ink">Market summary</p>
        <button type="button" onClick={onClose} aria-label="Hide market summary" className="ml-auto grid h-6 w-6 place-items-center rounded-md text-gc-ink-muted hover:bg-gc-panel hover:text-gc-ink">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <dl className="mt-2.5 space-y-1.5 text-[11.5px]">
        <div className="flex justify-between gap-3"><dt className="text-gc-ink-muted">Last price</dt><dd className="tabular-nums text-gc-ink">{fmt(market.price)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-gc-ink-muted">24h high / low</dt><dd className="tabular-nums text-gc-ink">{fmt(market.high)} / {fmt(market.low)}</dd></div>
        <div className="flex justify-between gap-3 border-t border-gc-line pt-1.5">
          <dt className="text-gc-ink-muted">24h change</dt>
          <dd className={cn("rounded-md px-1.5 tabular-nums", up ? "bg-gc-green-soft text-gc-success" : "bg-gc-red-soft text-gc-red")}>
            {signed(market.diff)} ({signed(market.pct)}%)
          </dd>
        </div>
        <div className="flex justify-between gap-3"><dt className="text-gc-ink-muted">Technicals</dt><dd className="text-gc-ink">{market.technicals.rating}</dd></div>
      </dl>
      {children}
    </div>
  );
}

/* ---------------- Sessions ---------------- */

export function MarketSessionsCard({ marketClosed }: { marketClosed: boolean }) {
  const now = useUtcNow();
  const session = activeSession(now, marketClosed);
  const hour = now != null ? new Date(now).getUTCHours() + new Date(now).getUTCMinutes() / 60 : null;
  return (
    <section className={panel} aria-label="Market sessions">
      <CardTitle right={<span title="Session hours shown in UTC" className="text-gc-ink-muted"><Info className="h-3.5 w-3.5" /></span>}>Market sessions</CardTitle>
      <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-gc-panel p-1 text-center text-[10.5px]">
        {SESSIONS.map((s) => {
          const live = hour != null && !marketClosed && inSession(Math.floor(hour), s);
          const lead = session?.key === s.key;
          return (
            <span
              key={s.key}
              className={cn(
                "truncate rounded-md px-1 py-1.5 font-medium",
                lead ? "bg-gc-blue text-gc-on-blue" : live ? "bg-gc-blue-soft text-gc-blue-deep" : "text-gc-ink-muted",
              )}
            >
              {s.key}
            </span>
          );
        })}
      </div>
      <div className="relative mt-3 h-1 rounded-full bg-gc-panel">
        {hour != null && (
          <span className="absolute -top-1 h-3 w-0.5 rounded-full bg-gc-blue" style={{ left: `${(hour / 24) * 100}%` }} aria-hidden="true" />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[9.5px] tabular-nums text-gc-ink-muted">
        {["00:00", "06:00", "12:00", "18:00", "24:00"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <p className="mt-2.5 flex items-center gap-2 text-[12px] text-gc-ink">
        <span className={cn("h-1.5 w-1.5 rounded-full", marketClosed ? "bg-gc-ink-muted" : "bg-gc-success")} aria-hidden="true" />
        {marketClosed ? "Gold market closed" : session ? `${session.key} · ${pad(session.start)}–${pad(session.end)} UTC` : "Between sessions"}
      </p>
      <p className="mt-0.5 pl-3.5 text-[11px] text-gc-ink-muted">{session?.note ?? "Low activity until the next open"}</p>
    </section>
  );
}

/* ---------------- Liquidity zones (watchlist style) ---------------- */

export function LiquidityZonesCard({ market }: { market: MarketSnapshot | null }) {
  const zones = useMemo(() => {
    if (!market) return [];
    const near = [...market.zones]
      .sort((a, b) => Math.abs((a.top + a.bottom) / 2 - market.price) - Math.abs((b.top + b.bottom) / 2 - market.price))
      .slice(0, 5);
    return near.sort((a, b) => b.top - a.top);
  }, [market]);
  return (
    <section className={panel} aria-label="Liquidity zones">
      <CardTitle right={<span className="text-[10px] text-gc-ink-muted">Nearest fresh zones</span>}>Liquidity zones</CardTitle>
      {zones.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-gc-ink-muted">No fresh zones on this timeframe yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-gc-line">
          {zones.map((z) => {
            const mid = (z.top + z.bottom) / 2;
            const dist = market ? ((mid - market.price) / market.price) * 100 : 0;
            const supply = z.type === "SUPPLY";
            return (
              <li key={`${z.type}-${z.top}-${z.bottom}`} className="flex items-center gap-2.5 py-2">
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold", supply ? "bg-gc-red-soft text-gc-red" : "bg-gc-green-soft text-gc-success")}>
                  {supply ? "S" : "D"}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[12px] tabular-nums text-gc-ink">{fmt(z.bottom)} – {fmt(z.top)}</p>
                  <p className="text-[10px] text-gc-ink-muted">{supply ? "Supply" : "Demand"}</p>
                </div>
                <span className="flex w-12 gap-0.5" aria-label={`Strength ${z.strength} of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={cn("h-1.5 flex-1 rounded-sm", n <= z.strength ? (supply ? "bg-gc-red" : "bg-gc-success") : "bg-gc-panel")} />
                  ))}
                </span>
                <span className={cn("w-14 text-right text-[11px] tabular-nums", dist >= 0 ? "text-gc-success" : "text-gc-red")}>
                  {signed(dist)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------- AI insight ---------------- */

export function AiInsightCard({ market, onAsk }: { market: MarketSnapshot | null; onAsk: () => void }) {
  const text = useMemo(() => {
    if (!market) return "Waiting for live gold candles…";
    const below = market.zones.filter((z) => z.type === "DEMAND" && z.top <= market.price).sort((a, b) => b.top - a.top)[0];
    const above = market.zones.filter((z) => z.type === "SUPPLY" && z.bottom >= market.price).sort((a, b) => a.bottom - b.bottom)[0];
    const trend = /bull/i.test(market.trend) ? "bullish" : /bear/i.test(market.trend) ? "bearish" : "undecided";
    const parts = [`XAU/USD is at ${fmt(market.price)} and structure reads ${trend}.`];
    if (below) parts.push(`Nearest demand sits at ${fmt(below.bottom)} – ${fmt(below.top)}.`);
    if (above) parts.push(`Nearest supply sits at ${fmt(above.bottom)} – ${fmt(above.top)}.`);
    if (below) parts.push(`A close below ${fmt(below.bottom)} would weaken the current read.`);
    return parts.join(" ");
  }, [market]);
  return (
    <section className={panel} aria-label="AI insight">
      <CardTitle right={<span className="text-[10px] text-gc-ink-muted">Rule-based · live</span>}>
        <span className="flex items-center gap-2">
          <img src="/favicon.png" alt="" className="h-4 w-4 rounded-sm object-contain" />
          AI insight
        </span>
      </CardTitle>
      <p className="mt-2.5 text-[12.5px] leading-5 text-gc-ink">{text}</p>
      <p className="mt-1.5 text-[10px] text-gc-ink-muted">Chart read only — not financial advice.</p>
      <button
        type="button"
        onClick={onAsk}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gc-blue py-2 text-[12.5px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover"
      >
        View full analysis <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}

/* ---------------- Bottom tabs ---------------- */

function nyTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function TerminalBottomTabs({ news, onAsk, screener }: { news: NewsEvent[]; onAsk: () => void; screener?: ReactNode }) {
  const [tab, setTab] = useState<"screener" | "news" | "alerts">(screener ? "screener" : "news");
  const fetchNotifications = useServerFn(listNotifications);
  const alertsQuery = useQuery({
    queryKey: ["terminal-signal-alerts"],
    queryFn: () => fetchNotifications(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const alerts: NotificationRow[] = (alertsQuery.data?.items ?? []).filter((n) => n.type === "signal_alert").slice(0, 5);
  const tabBtn = (key: "screener" | "news" | "alerts", label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      aria-pressed={tab === key}
      className={cn(
        "relative h-10 px-1 text-[12.5px] font-medium transition",
        tab === key ? "text-gc-blue after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-gc-blue" : "text-gc-ink-muted hover:text-gc-ink",
      )}
    >
      {label}
    </button>
  );
  const th = "sticky top-0 bg-background px-4 py-1.5 text-left text-[11px] font-normal text-gc-ink-muted";
  const td = "px-4 py-2 text-[12px] text-gc-ink";
  return (
    <section className="hidden h-[218px] shrink-0 flex-col overflow-hidden rounded-xl border border-gc-line bg-background lg:flex" aria-label="News and alerts">
      <div className="flex items-center gap-6 border-b border-gc-line px-4">
        <span className="mr-2 text-[13px] font-medium text-gc-ink">Market desk</span>
        {screener && tabBtn("screener", "Screener")}
        {tabBtn("news", `News (${news.length})`)}
        {tabBtn("alerts", `Alerts (${alerts.length})`)}
        <button
          type="button"
          onClick={onAsk}
          className="ml-auto flex h-7 items-center gap-2 rounded-md bg-gc-blue px-3 text-[12px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover"
        >
          <img src="/favicon.png" alt="" className="h-4 w-4 rounded-sm bg-background object-contain" />
          Ask AI
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "screener" && screener ? (
          screener
        ) : tab === "news" ? (
          news.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-gc-ink-muted">No important gold news ahead.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gc-line">
                  <th className={th}>Time (NY)</th>
                  <th className={th}>Event</th>
                  <th className={th}>Impact</th>
                  <th className={th}>Forecast</th>
                  <th className={th}>Previous</th>
                </tr>
              </thead>
              <tbody>
                {news.map((e) => (
                  <tr key={`${e.date}-${e.title}`} className="border-b border-gc-line last:border-0">
                    <td className={cn(td, "whitespace-nowrap tabular-nums")}>{nyTime(e.date)}</td>
                    <td className={td}>
                      <span className="mr-1.5 text-gc-ink-muted">{e.country}</span>
                      {e.title}
                    </td>
                    <td className={td}>
                      <span className={cn("rounded-md px-2 py-0.5 text-[12px] font-medium", e.impact === "High" ? "bg-gc-red-soft text-gc-red" : "bg-gc-yellow-soft text-gc-ink")}>
                        {e.impact}
                      </span>
                    </td>
                    <td className={cn(td, "tabular-nums")}>{e.forecast ?? "—"}</td>
                    <td className={cn(td, "tabular-nums")}>{e.previous ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : alerts.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-gc-ink-muted">
            {alertsQuery.isPending ? "Loading alerts…" : "No signal alerts yet."}{" "}
            <Link to="/dashboard/notifications" className="text-gc-blue hover:underline">
              All notifications
            </Link>
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gc-line">
                <th className={th}>Time</th>
                <th className={th}>Signal</th>
                <th className={th}>Entry</th>
                <th className={th}>SL</th>
                <th className={th}>TP</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const sell = /sell/i.test(String(a.data?.direction ?? ""));
                return (
                  <tr key={a.id} className="border-b border-gc-line last:border-0">
                    <td className={cn(td, "whitespace-nowrap tabular-nums")}>{nyTime(a.created_at)}</td>
                    <td className={td}>
                      <span className={cn("rounded-md px-2 py-0.5 text-[12px] font-medium", sell ? "bg-gc-red-soft text-gc-red" : "bg-gc-green-soft text-gc-success")}>
                        {a.title}
                      </span>
                    </td>
                    <td className={cn(td, "tabular-nums")}>{a.data?.entry ?? "—"}</td>
                    <td className={cn(td, "tabular-nums")}>{a.data?.sl ?? "—"}</td>
                    <td className={cn(td, "tabular-nums")}>{Array.isArray(a.data?.tp) ? a.data.tp[0] : (a.data?.tp ?? "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
