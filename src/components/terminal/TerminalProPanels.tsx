import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { listNotifications, type NotificationRow } from "@/lib/notifications.functions";
import type { NewsEvent } from "@/lib/news.functions";

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
};

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n: number, digits = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;

function Sparkline({ values, tone }: { values: number[]; tone: "up" | "down" | "blue" | "violet" }) {
  const path = useMemo(() => {
    if (values.length < 2) return "";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * 96 + 2).toFixed(1)},${(34 - ((v - min) / span) * 30).toFixed(1)}`)
      .join(" ");
  }, [values]);
  const stroke =
    tone === "up" ? "text-gc-success" : tone === "down" ? "text-gc-red" : tone === "violet" ? "text-gc-navy" : "text-gc-blue";
  if (!path) return <span className="h-9 w-24" />;
  return (
    <svg viewBox="0 0 100 38" className={cn("h-9 w-24 shrink-0", stroke)} aria-hidden="true">
      <path d={`${path} L98,38 L2,38 Z`} fill="currentColor" opacity="0.1" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

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

/* ---------------- Stat cards ---------------- */

export function TerminalStatCards({
  market,
  nextNews,
  marketClosed,
}: {
  market: MarketSnapshot | null;
  nextNews?: NewsEvent;
  marketClosed: boolean;
}) {
  const now = useUtcNow();
  const session = activeSession(now, marketClosed);
  const up = (market?.diff ?? 0) >= 0;
  const minsToNews = nextNews && now != null ? Math.round((new Date(nextNews.date).getTime() - now) / 60_000) : null;
  const newsLabel =
    minsToNews == null ? "—" : minsToNews <= 0 ? "Now" : minsToNews >= 60 ? `${Math.floor(minsToNews / 60)}h ${minsToNews % 60}m` : `${minsToNews}m`;
  const card = "flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-gc-line/70 bg-background px-5 py-4";
  return (
    <div className="hidden shrink-0 grid-cols-4 gap-3 lg:grid">
      <div className={card}>
        <div className="min-w-0">
          <p className="text-[13px] text-gc-ink-muted">Price</p>
          <p className="mt-1 text-[24px] font-medium leading-tight tabular-nums text-gc-ink">{market ? fmt(market.price) : "—"}</p>
          <p className="mt-0.5 text-[12px] text-gc-ink-muted">XAU/USD</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Sparkline values={market?.spark ?? []} tone={up ? "up" : "down"} />
          {market && (
            <span className={cn("text-[11px] font-medium tabular-nums", up ? "text-gc-success" : "text-gc-red")}>
              {signed(market.diff)} {signed(market.pct)}%
            </span>
          )}
        </div>
      </div>
      <div className={card}>
        <div className="min-w-0">
          <p className="text-[13px] text-gc-ink-muted">Day change</p>
          <p className={cn("mt-1 text-[24px] font-medium leading-tight tabular-nums", up ? "text-gc-success" : "text-gc-red")}>
            {market ? `${signed(market.pct)}%` : "—"}
          </p>
          <p className="mt-0.5 text-[12px] tabular-nums text-gc-ink-muted">
            {market ? `${signed(market.diff)} · 24h` : "Last 24 hours"}
          </p>
        </div>
        <Sparkline values={market?.spark ?? []} tone={up ? "up" : "down"} />
      </div>
      <div className={card}>
        <div className="min-w-0">
          <p className="text-[13px] text-gc-ink-muted">Session</p>
          <p className="mt-1 truncate text-[24px] font-medium leading-tight text-gc-ink">{session?.key ?? "—"}</p>
          <p className="mt-0.5 text-[12px] text-gc-ink-muted">{marketClosed ? "Weekend close" : session ? "Active now" : "Between sessions"}</p>
        </div>
        <Sparkline values={market?.spark.slice(-16) ?? []} tone="blue" />
      </div>
      <div className={card}>
        <div className="min-w-0">
          <p className="text-[13px] text-gc-ink-muted">Next news in</p>
          <p className="mt-1 text-[24px] font-medium leading-tight tabular-nums text-gc-ink">{newsLabel}</p>
          <p className="mt-0.5 truncate text-[12px] text-gc-ink-muted" title={nextNews?.title}>
            {nextNews ? `${nextNews.country} ${nextNews.title}` : "No important news ahead"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
            nextNews?.impact === "High" ? "bg-gc-red-soft text-gc-red" : nextNews ? "bg-gc-yellow-soft text-gc-ink" : "bg-gc-panel text-gc-ink-muted",
          )}
        >
          {nextNews ? `${nextNews.impact} impact` : "Clear"}
        </span>
      </div>
    </div>
  );
}

/* ---------------- Right column ---------------- */

const panel = "rounded-2xl border border-gc-line/70 bg-background p-5";

export function MarketSessionsCard({ marketClosed }: { marketClosed: boolean }) {
  const now = useUtcNow();
  const session = activeSession(now, marketClosed);
  const hour = now != null ? new Date(now).getUTCHours() + new Date(now).getUTCMinutes() / 60 : null;
  return (
    <section className={panel} aria-label="Market sessions">
      <div className="flex items-center gap-1.5">
        <h2 className="text-[17px] font-medium text-gc-ink">Market Sessions</h2>
        <span title="Session hours shown in UTC" className="text-gc-ink-muted">
          <Info className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1 rounded-lg bg-gc-panel p-1 text-center text-[11px]">
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
      <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-gc-ink-muted">
        {["00:00", "06:00", "12:00", "18:00", "24:00"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-gc-console-bar px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[14px] font-medium text-gc-ink">
            <span className={cn("h-2 w-2 rounded-full", marketClosed ? "bg-gc-ink-muted" : "bg-gc-success")} aria-hidden="true" />
            {marketClosed ? "Gold market closed" : session ? `${session.key} session` : "Between sessions"}
          </span>
          {!marketClosed && session && <span className="text-[12px] font-medium text-gc-success">Active now</span>}
        </div>
        <p className="mt-1 text-[12px] tabular-nums text-gc-ink-muted">
          {session && !marketClosed ? `${pad(session.start)} – ${pad(session.end)} UTC` : ""}
        </p>
        <p className="mt-0.5 text-[12px] text-gc-ink-muted">{session?.note ?? "Low activity until the next open"}</p>
      </div>
    </section>
  );
}

export function LiquidityZonesCard({ market }: { market: MarketSnapshot | null }) {
  const zones = useMemo(() => {
    if (!market) return [];
    const near = [...market.zones]
      .sort((a, b) => Math.abs((a.top + a.bottom) / 2 - market.price) - Math.abs((b.top + b.bottom) / 2 - market.price))
      .slice(0, 4);
    return near.sort((a, b) => b.top - a.top);
  }, [market]);
  return (
    <section className={panel} aria-label="Liquidity zones">
      <h2 className="text-[17px] font-medium text-gc-ink">Liquidity Zones</h2>
      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 text-[12px] text-gc-ink-muted">
        <span>Zone (USD)</span>
        <span>Type</span>
        <span className="w-[68px]">Strength</span>
      </div>
      {zones.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-gc-ink-muted">No fresh zones on this timeframe yet.</p>
      ) : (
        <ul className="mt-1">
          {zones.map((z) => (
            <li key={`${z.type}-${z.top}-${z.bottom}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-2">
              <span className="whitespace-nowrap text-[13px] tabular-nums text-gc-ink">
                {fmt(z.bottom)} – {fmt(z.top)}
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[12px] font-medium",
                  z.type === "SUPPLY" ? "bg-gc-red-soft text-gc-red" : "bg-gc-blue-soft text-gc-blue-deep",
                )}
              >
                {z.type === "SUPPLY" ? "Supply" : "Demand"}
              </span>
              <span className="flex w-[68px] gap-0.5" aria-label={`Strength ${z.strength} of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={cn(
                      "h-2 flex-1 rounded-sm",
                      n <= z.strength ? (z.type === "SUPPLY" ? "bg-gc-red" : "bg-gc-blue") : "bg-gc-panel",
                    )}
                  />
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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
      <div className="flex items-center gap-2">
        <img src="/favicon.png" alt="" className="h-5 w-5 rounded-sm object-contain" />
        <h2 className="text-[17px] font-medium text-gc-ink">AI Insight</h2>
        <span className="ml-auto text-[11px] text-gc-ink-muted">Rule-based · live</span>
      </div>
      <p className="mt-3 text-[13.5px] leading-6 text-gc-ink">{text}</p>
      <p className="mt-2 text-[11px] text-gc-ink-muted">Chart read only — not financial advice.</p>
      <button
        type="button"
        onClick={onAsk}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gc-blue-soft py-2.5 text-[14px] font-medium text-gc-blue-deep transition hover:bg-gc-console-rail-active"
      >
        View full analysis <ArrowRight className="h-4 w-4" />
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

export function TerminalBottomTabs({ news, onAsk }: { news: NewsEvent[]; onAsk: () => void }) {
  const [tab, setTab] = useState<"news" | "alerts">("news");
  const fetchNotifications = useServerFn(listNotifications);
  const alertsQuery = useQuery({
    queryKey: ["terminal-signal-alerts"],
    queryFn: () => fetchNotifications(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const alerts: NotificationRow[] = (alertsQuery.data?.items ?? []).filter((n) => n.type === "signal_alert").slice(0, 5);
  const tabBtn = (key: "news" | "alerts", label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      aria-pressed={tab === key}
      className={cn(
        "relative h-12 px-1 text-[14px] font-medium transition",
        tab === key ? "text-gc-blue after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-gc-blue" : "text-gc-ink-muted hover:text-gc-ink",
      )}
    >
      {label}
    </button>
  );
  const th = "px-5 py-2 text-left text-[12px] font-normal text-gc-ink-muted";
  const td = "px-5 py-2.5 text-[13px] text-gc-ink";
  return (
    <section className="hidden h-[212px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gc-line/70 bg-background lg:flex" aria-label="News and alerts">
      <div className="flex items-center gap-7 border-b border-gc-line/70 px-5">
        {tabBtn("news", `News (${news.length})`)}
        {tabBtn("alerts", `Alerts (${alerts.length})`)}
        <button
          type="button"
          onClick={onAsk}
          className="ml-auto flex h-9 items-center gap-2 rounded-lg bg-gc-blue px-4 text-[13px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover"
        >
          <img src="/favicon.png" alt="" className="h-4 w-4 rounded-sm bg-background object-contain" />
          Ask AI
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "news" ? (
          news.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-gc-ink-muted">No important gold news ahead.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gc-line/60">
                  <th className={th}>Time (NY)</th>
                  <th className={th}>Event</th>
                  <th className={th}>Impact</th>
                  <th className={th}>Forecast</th>
                  <th className={th}>Previous</th>
                </tr>
              </thead>
              <tbody>
                {news.map((e) => (
                  <tr key={`${e.date}-${e.title}`} className="border-b border-gc-line/40 last:border-0">
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
              <tr className="border-b border-gc-line/60">
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
                  <tr key={a.id} className="border-b border-gc-line/40 last:border-0">
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
