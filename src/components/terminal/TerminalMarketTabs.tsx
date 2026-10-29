import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { getGoldHeadlines, getGoldOverview, getGoldSeasonals } from "@/lib/terminal-overview.functions";
import { getGoldNewsBoard } from "@/lib/news.functions";
import type { NewsEvent } from "@/lib/news-split";
import { PERIODS, type PeriodKey } from "@/lib/chart/gold-history";
import type { OhlcvBar } from "@/lib/chart/indicators";
import { ratingFor, type TechReading, type TechVerdict } from "@/lib/chart/technicals";
import { cn } from "@/lib/utils";
import { XauUsdLogo } from "./XauUsdLogo";
import { num, useTechnicals, useWatchQuotes } from "./terminal-market";

export type MarketTab = "overview" | "news" | "technicals" | "seasonals";
const TABS: Array<{ id: MarketTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "news", label: "News" },
  { id: "technicals", label: "Technicals" },
  { id: "seasonals", label: "Seasonals" },
];

const TECH_TABS = [
  { key: "1m", label: "1 minute" },
  { key: "5m", label: "5 minutes" },
  { key: "15m", label: "15 minutes" },
  { key: "30m", label: "30 minutes" },
  { key: "1h", label: "1 hour" },
  { key: "2h", label: "2 hours" },
  { key: "4h", label: "4 hours" },
  { key: "1d", label: "1 day" },
];

const pct = (v: number | null | undefined, d = 2) => (v == null ? "—" : `${v >= 0 ? "" : "−"}${Math.abs(v).toFixed(d)}%`);
const pctTone = (v: number | null | undefined) => (v == null ? "text-gc-ink-muted" : v >= 0 ? "text-gc-green" : "text-gc-red");

/** Chart timeframe used when a range button under the chart is picked. */
export const PERIOD_TIMEFRAME: Record<PeriodKey, string> = {
  "1d": "5m",
  "5d": "30m",
  "1m": "4h",
  "3m": "1d",
  "6m": "1d",
  ytd: "1d",
  "1y": "1d",
  "5y": "1d",
  "10y": "1d",
  all: "1d",
};

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** TradingView-style symbol header: big name, live price, change and the section tabs. */
export function TerminalSymbolHeader({
  price,
  tab,
  onTabChange,
  marketOpen = true,
}: {
  price: number | null;
  tab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
  marketOpen?: boolean;
}) {
  const quotes = useWatchQuotes();
  const q = quotes.data?.XAUUSD;
  const live = price ?? q?.price ?? null;
  const ch = q?.changePct ?? null;
  const prev = live != null && ch != null ? live / (1 + ch / 100) : null;
  const abs = live != null && prev != null ? live - prev : null;
  const now = useClock();
  const priceText = live != null ? num(live, 5) : "—";
  const head = priceText.length > 5 ? priceText.slice(0, -5) : "";
  const tail = priceText.length > 5 ? priceText.slice(-5) : priceText;

  return (
    <section aria-label="Euro / U.S. Dollar" className="hidden shrink-0 bg-card font-sans lg:block">
      <div className="flex items-center gap-5 px-5 pb-3 pt-4">
        <XauUsdLogo size={80} />
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-gc-ink 2xl:text-[34px]">Euro / U.S. Dollar</h1>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[36px] font-semibold leading-none tabular-nums tracking-tight text-gc-ink 2xl:text-[44px]">
              {head}
              <span className={abs == null ? "" : abs >= 0 ? "text-gc-green" : "text-gc-red"}>{tail}</span>
              <span className="ml-1 text-[13px] font-normal text-gc-ink-muted">USD</span>
            </p>
            {abs != null && (
              <p className={cn("text-[18px] font-medium tabular-nums", pctTone(abs))}>
                {abs >= 0 ? "+" : "−"}
                {num(Math.abs(abs), 5)} <span className="ml-1">{abs >= 0 ? "+" : ""}{pct(ch)}</span>
              </p>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] text-gc-ink-muted">
            {marketOpen ? "Live" : "Market closed"}
            {now && ` · As of today at ${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} UTC`}
          </p>
        </div>
        <HeaderSidePanel quotes={quotes.data} now={now} />
      </div>
      <nav aria-label="EUR/USD sections" className="flex gap-7 border-b-2 border-gc-line px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              "-mb-[2px] border-b-[3px] pb-2 pt-1.5 text-[14.5px] font-medium transition-colors",
              tab === t.id ? "border-gc-ink text-gc-ink" : "border-transparent text-gc-ink-muted hover:text-gc-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </section>
  );
}

/** Range returns under the Overview chart (1 day … All time); picking one switches the chart timeframe. */
export function TerminalPeriodReturns({ timeframeKey, onPick }: { timeframeKey: string; onPick: (period: PeriodKey) => void }) {
  const fetchOverview = useServerFn(getGoldOverview);
  const query = useQuery({
    queryKey: ["terminal-gold-overview", "1d"],
    queryFn: () => fetchOverview({ data: { period: "1d" } }),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const [picked, setPicked] = useState<PeriodKey | null>(null);
  const active = picked && PERIOD_TIMEFRAME[picked] === timeframeKey ? picked : PERIODS.find((p) => PERIOD_TIMEFRAME[p.key] === timeframeKey)?.key ?? null;
  const perf = query.data?.performance ?? null;
  return (
    <div className="hidden shrink-0 bg-card px-3 pb-4 pt-2 font-sans lg:block">
      <div className="grid grid-cols-5 gap-1 xl:grid-cols-10">
        {PERIODS.map((p) => {
          const v = perf?.[p.key] ?? null;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPicked(p.key);
                onPick(p.key);
              }}
              aria-pressed={active === p.key}
              className={cn(
                "rounded-lg px-2 py-3 text-center transition-colors",
                active === p.key ? "bg-gc-console-search dark:bg-accent" : "hover:bg-gc-console-search/60 dark:hover:bg-accent/60",
              )}
            >
              <span className="block text-[14px] font-normal text-gc-ink">{p.label}</span>
              <span className={cn("block text-[14px] font-normal tabular-nums", pctTone(v))}>{pct(v)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Body of the News, Technicals and Seasonals tabs. */
export function TerminalTabBody({ tab, bars, timeframeKey }: { tab: MarketTab; bars: OhlcvBar[]; timeframeKey: string }) {
  if (tab === "overview") return null;
  return (
    <section aria-label="EUR/USD details" className="hidden min-h-[540px] shrink-0 bg-card px-6 py-6 font-sans lg:block">
      {tab === "news" && <NewsTab />}
      {tab === "technicals" && <TechnicalsTab bars={bars} timeframeKey={timeframeKey} />}
      {tab === "seasonals" && <SeasonalsTab />}
    </section>
  );
}

function niceTicks(min: number, max: number, count = 6) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(v);
  return out;
}

/* ---------------- News ---------------- */

function nyStamp(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true }).format(d);
  return `${date}, ${time} NY`;
}

/** Gold-moving economic calendar: next events plus the last released ones. */
function EventsTable() {
  const fetchBoard = useServerFn(getGoldNewsBoard);
  const q = useQuery({ queryKey: ["terminal-news-board"], queryFn: () => fetchBoard(), staleTime: 5 * 60_000, refetchInterval: 5 * 60_000, refetchIntervalInBackground: false, retry: 2 });
  const rows: { e: NewsEvent; released: boolean }[] = [
    ...(q.data?.upcoming ?? []).map((e) => ({ e, released: false })),
    ...(q.data?.previous ?? []).map((e) => ({ e, released: true })),
  ];
  return (
    <div className="mb-10">
      <h3 className="mb-5 text-[24px] font-medium text-gc-ink">Economic events</h3>
      {q.isPending ? (
        <p className="py-6 text-center text-[13px] text-gc-ink-muted">Loading events…</p>
      ) : q.isError || !q.data ? (
        <p className="py-6 text-center text-[13px] text-gc-ink-muted">Events feed unavailable right now. Please try again shortly.</p>
      ) : !rows.length ? (
        <p className="py-6 text-center text-[13px] text-gc-ink-muted">No EUR/USD-moving events this week.</p>
      ) : (
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-gc-line text-[12px] text-gc-ink-muted">
              <th className="w-[190px] py-2.5 font-normal">Time</th>
              <th className="w-[96px] py-2.5 font-normal">Status</th>
              <th className="py-2.5 font-normal">Event</th>
              <th className="py-2.5 font-normal">Impact</th>
              <th className="py-2.5 text-right font-normal">Forecast / Previous</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, released }) => (
              <tr key={e.date + e.title} className="border-b border-gc-line/70 hover:bg-gc-console-search/50">
                <td className="py-3 text-gc-ink-muted">{nyStamp(e.date)}</td>
                <td className={cn("py-3", released ? "text-gc-ink-muted" : "text-gc-blue")}>{released ? "Released" : "Upcoming"}</td>
                <td className="py-3 pr-4 text-gc-ink">{e.country} · {e.title}</td>
                <td className="py-3">
                  <span className="inline-flex items-center gap-1.5 text-gc-ink-muted">
                    <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", e.impact === "High" ? "bg-destructive" : "bg-gc-yellow")} />
                    {e.impact}
                  </span>
                </td>
                <td className="py-3 text-right text-gc-ink-muted">{e.forecast || "—"} / {e.previous || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} minutes ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
  return `${Math.round(s / 86400)} days ago`;
}

function NewsTab() {
  const fetchNews = useServerFn(getGoldHeadlines);
  const query = useQuery({ queryKey: ["terminal-gold-headlines"], queryFn: () => fetchNews(), staleTime: 5 * 60_000, refetchInterval: 5 * 60_000, refetchIntervalInBackground: false });
  // Latest 15 headlines only, newest first.
  const items = [...(query.data?.items ?? [])]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 15);
  return (
    <div>
      <EventsTable />
      <h3 className="mb-5 text-[24px] font-medium text-gc-ink">Headlines</h3>
      {query.isPending ? (
        <p className="py-8 text-center text-[13px] text-gc-ink-muted">Loading headlines…</p>
      ) : !items.length ? (
        <p className="py-8 text-center text-[13px] text-gc-ink-muted">{query.data?.error ?? "No gold headlines right now."}</p>
      ) : (
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-gc-line text-[12px] text-gc-ink-muted">
              <th className="w-[150px] py-2.5 font-normal">Time</th>
              <th className="w-[96px] py-2.5 font-normal">Instrument</th>
              <th className="py-2.5 font-normal">Headline</th>
              <th className="py-2.5 text-right font-normal">Provider</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.link} className="border-b border-gc-line/70 hover:bg-gc-console-search/50">
                <td className="py-3 text-gc-ink-muted">{ago(n.publishedAt)}</td>
                <td className="py-3"><XauUsdLogo size={18} /></td>
                <td className="py-3 pr-4">
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 text-gc-ink hover:text-gc-blue">
                    {n.title}
                    <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-70" />
                  </a>
                </td>
                <td className="py-3 text-right text-gc-ink-muted">{n.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---------------- Technicals ---------------- */

function countVerdicts(list: TechReading[]) {
  const c = { buy: 0, neutral: 0, sell: 0 };
  for (const x of list) c[x.verdict as TechVerdict]++;
  const n = list.length || 1;
  return { ...c, rating: ratingFor((c.buy - c.sell) / n), score: (c.buy - c.sell) / n };
}

function Gauge({ title, score, rating, counts, big }: { title: string; score: number; rating: string; counts: { sell: number; neutral: number; buy: number }; big?: boolean }) {
  const r = 70;
  const cx = 90;
  const cy = 86;
  // 5 segments over 180° with small gaps: strong sell, sell, neutral, buy, strong buy.
  const segs = [0, 1, 2, 3, 4].map((i) => {
    const a0 = Math.PI - (i * Math.PI) / 5 - 0.06;
    const a1 = Math.PI - ((i + 1) * Math.PI) / 5 + 0.06;
    const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy - r * Math.sin(a)).toFixed(2)}`;
    return `M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}`;
  });
  const segClass = ["stroke-gc-red", "stroke-gc-red/60", "stroke-gc-ink-muted/50", "stroke-gc-blue/60", "stroke-gc-blue"];
  const angle = Math.max(-1, Math.min(1, score)) * 90;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 96" className={big ? "h-[120px] w-[226px]" : "h-[92px] w-[172px]"} aria-hidden="true">
        {segs.map((d, i) => (
          <path key={i} d={d} fill="none" strokeWidth="6" strokeLinecap="round" className={segClass[i]} />
        ))}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: "transform 600ms ease" }}>
          <path d={`M${cx - 3} ${cy} L${cx} ${cy - 58} L${cx + 3} ${cy} Z`} className="fill-gc-ink" />
        </g>
        <circle cx={cx} cy={cy} r="5" className="fill-gc-ink" />
      </svg>
      <p className={cn("mt-1 font-medium text-gc-ink", big ? "text-[14px]" : "text-[13px]")}>{title}</p>
      <p className={cn("font-medium text-gc-ink", big ? "text-[22px]" : "text-[18px]")}>{rating}</p>
      <div className="mt-2 grid grid-cols-3 gap-5 bg-gc-console-search px-4 py-2 text-center text-[13px]">
        {(["sell", "neutral", "buy"] as const).map((k) => (
          <div key={k}>
            <p className="capitalize text-gc-ink-muted">{k}</p>
            <p className="font-medium tabular-nums text-gc-ink">{counts[k]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TechnicalsTab({ bars, timeframeKey }: { bars: OhlcvBar[]; timeframeKey: string }) {
  const { tech, activeTf, setTechTf, isError } = useTechnicals(bars, timeframeKey, TECH_TABS);
  const osc = tech ? countVerdicts(tech.oscillators) : null;
  const ma = tech ? countVerdicts(tech.movingAverages) : null;
  return (
    <div>
      <h3 className="text-[24px] font-medium text-gc-ink">Indicators' summary</h3>
      <p className="mt-2 max-w-[640px] text-[14px] leading-6 text-gc-ink-muted">
        Technical overview for the selected timeframe, from moving averages and oscillators on closed candles, summed up in the Summary gauge. Indicator readings only, not trade advice.
      </p>
      <div className="mt-4 flex flex-wrap gap-1">
        {TECH_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTechTf(t.key)}
            aria-pressed={activeTf === t.key}
            className={cn("px-3 py-1.5 text-[13px] transition-colors", activeTf === t.key ? "bg-gc-console-search font-medium text-gc-ink" : "text-gc-ink-muted hover:text-gc-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tech && osc && ma ? (
        <div className="mt-6 grid grid-cols-3 items-end gap-4">
          <Gauge title="Oscillators" score={osc.score} rating={osc.rating} counts={osc} />
          <Gauge title="Summary" score={tech.score} rating={tech.rating} counts={tech.counts} big />
          <Gauge title="Moving Averages" score={ma.score} rating={ma.rating} counts={ma} />
        </div>
      ) : (
        <p className="py-10 text-center text-[13px] text-gc-ink-muted">{isError ? "Candles unavailable right now." : "Loading candles…"}</p>
      )}
    </div>
  );
}

/* ---------------- Seasonals ---------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_DAY = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const SEASON_COLORS = ["text-season-1", "text-season-2", "text-season-3", "text-season-4", "text-season-5"];
const SEASON_BG = ["bg-season-1", "bg-season-2", "bg-season-3", "bg-season-4", "bg-season-5"];

function SeasonalsTab() {
  const fetchSeasonals = useServerFn(getGoldSeasonals);
  const query = useQuery({ queryKey: ["terminal-gold-seasonals"], queryFn: () => fetchSeasonals(), staleTime: 30 * 60_000 });
  const series = query.data?.series ?? [];
  const W = 1000;
  const H = 360;
  const geo = useMemo(() => {
    if (!series.length) return null;
    const all = series.flatMap((s) => s.points.map((p) => p[1]));
    let min = Math.min(0, ...all);
    let max = Math.max(0, ...all);
    const pad = (max - min) * 0.06 || 1;
    min -= pad;
    max += pad;
    const x = (d: number) => (d / 365) * W;
    const y = (v: number) => H - ((v - min) / (max - min)) * H;
    return { x, y, ticks: niceTicks(min, max, 8) };
  }, [series]);
  const current = series[series.length - 1]?.year;
  const sortedLabels = [...series].sort((a, b) => b.last - a.last);

  return (
    <div>
      <h3 className="text-[24px] font-medium text-gc-ink">Historical seasonal performance</h3>
      <p className="mt-2 max-w-[680px] text-[14px] leading-6 text-gc-ink-muted">
        How gold moved through each calendar year, as % change from the start of the year. Seasonality shows past patterns only; it is not a forecast.
      </p>
      {!geo ? (
        <p className="py-12 text-center text-[13px] text-gc-ink-muted">{query.data?.error ?? "Loading seasonal history…"}</p>
      ) : (
        <div className="mt-6 flex gap-3">
          <div className="relative h-[360px] min-w-0 flex-1">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label="Gold seasonal performance by year">
              {MONTH_DAY.slice(1).map((d) => (
                <line key={d} x1={geo.x(d)} x2={geo.x(d)} y1="0" y2={H} strokeDasharray="3 5" strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-gc-line" />
              ))}
              <line x1="0" x2={W} y1={geo.y(0)} y2={geo.y(0)} strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-gc-ink-muted/50" />
              {series.map((s, i) => {
                const isCur = s.year === current;
                const d = s.points.map((p, j) => `${j ? "L" : "M"}${geo.x(p[0]).toFixed(1)},${geo.y(p[1]).toFixed(1)}`).join("");
                return (
                  <path
                    key={s.year}
                    d={d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isCur ? 2.6 : 1.2}
                    vectorEffect="non-scaling-stroke"
                    className={isCur ? "text-gc-blue" : SEASON_COLORS[i % SEASON_COLORS.length]}
                  />
                );
              })}
            </svg>
            <div className="pointer-events-none absolute -bottom-6 left-0 right-0 text-[11px] text-gc-ink-muted">
              {MONTHS.map((m, i) => (
                <span key={m} className="absolute" style={{ left: `${(MONTH_DAY[i] / 365) * 100}%` }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div className="relative h-[360px] w-[120px] shrink-0 text-[11px] tabular-nums">
            {geo.ticks.map((v) => (
              <span key={v} className="absolute right-0 -translate-y-1/2 text-gc-ink-muted" style={{ top: `${(geo.y(v) / H) * 100}%` }}>
                {v.toFixed(2)}%
              </span>
            ))}
          </div>
          <ul className="w-[130px] shrink-0 space-y-1.5 self-center text-[12px]">
            {sortedLabels.map((s) => {
              const i = series.indexOf(s);
              const isCur = s.year === current;
              return (
                <li key={s.year} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-gc-ink">
                    <span className={cn("h-2.5 w-2.5", isCur ? "bg-gc-blue" : SEASON_BG[i % SEASON_BG.length])} />
                    {s.year}
                  </span>
                  <span className={cn("tabular-nums", pctTone(s.last))}>{pct(s.last)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="h-6" />
    </div>
  );
}

const SESSIONS = [
  { id: "asia", label: "Asia", start: 0, end: 9 },
  { id: "london", label: "London", start: 7, end: 16 },
  { id: "ny", label: "New York", start: 12, end: 21 },
];

const MOVERS = [
  { symbol: "DXY", label: "DXY", decimals: 3 },
  { symbol: "US10Y", label: "US 10Y", decimals: 3 },
  { symbol: "XAGUSD", label: "Silver", decimals: 3 },
  { symbol: "EURUSD", label: "EUR/USD", decimals: 5 },
  { symbol: "USDJPY", label: "USD/JPY", decimals: 3 },
  { symbol: "SPX", label: "S&P 500", decimals: 2 },
];

/** Right side of the symbol header: markets that move gold plus today's trading sessions (UTC). */
function HeaderSidePanel({ quotes, now }: { quotes?: Record<string, { price: number; changePct: number | null }>; now: Date | null }) {
  const hour = now ? now.getUTCHours() + now.getUTCMinutes() / 60 : null;
  return (
    <div className="ml-auto hidden shrink-0 items-stretch gap-6 xl:flex">
      <div>
        <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-gc-ink-muted">Moves EUR/USD</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {MOVERS.map((m) => {
            const q = quotes?.[m.symbol];
            return (
              <div key={m.symbol} className="flex min-w-[150px] items-baseline justify-between gap-3">
                <span className="text-[13px] text-gc-ink">{m.label}</span>
                <span className="text-[13px] tabular-nums text-gc-ink">
                  {q ? num(q.price, m.decimals) : "—"}
                  <span className={cn("ml-2 text-[12px]", pctTone(q?.changePct))}>{pct(q?.changePct)}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-l border-gc-line pl-6">
        <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-gc-ink-muted">Sessions · UTC</p>
        <div className="space-y-1.5">
          {SESSIONS.map((s) => {
            const active = hour != null && hour >= s.start && hour < s.end;
            const progress = active && hour != null ? ((hour - s.start) / (s.end - s.start)) * 100 : 0;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className={cn("w-16 text-[13px]", active ? "font-medium text-gc-ink" : "text-gc-ink-muted")}>{s.label}</span>
                <span className="relative h-1.5 w-28 overflow-hidden rounded-full bg-gc-console-search">
                  {active && <span className="absolute inset-y-0 left-0 rounded-full bg-gc-blue" style={{ width: `${progress}%` }} />}
                </span>
                <span className="text-[12px] tabular-nums text-gc-ink-muted">
                  {String(s.start).padStart(2, "0")}–{String(s.end).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
