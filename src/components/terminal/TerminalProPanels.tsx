import { useEffect, useMemo, useState } from "react";
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

@@MIDDLE@@
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
