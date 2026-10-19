import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { getGoldHeadlines, getGoldOverview, getGoldSeasonals } from "@/lib/terminal-overview.functions";
import { PERIODS, type PeriodKey } from "@/lib/chart/gold-history";
import type { OhlcvBar } from "@/lib/chart/indicators";
import { ratingFor, type TechReading, type TechVerdict } from "@/lib/chart/technicals";
import { cn } from "@/lib/utils";
import { XauUsdLogo } from "./XauUsdLogo";
import { num, useTechnicals, useWatchQuotes } from "./terminal-market";

type Tab = "overview" | "news" | "technicals" | "seasonals";
const TABS: Array<{ id: Tab; label: string }> = [
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

/** TradingView-style symbol section under the chart: Overview, News, Technicals, Seasonals. */
export function TerminalMarketTabs({ bars, price, timeframeKey }: { bars: OhlcvBar[]; price: number | null; timeframeKey: string }) {
  const [tab, setTab] = useState<Tab>("news");
  const quotes = useWatchQuotes();
  const q = quotes.data?.XAUUSD;
  const live = price ?? q?.price ?? null;
  const ch = q?.changePct ?? null;
  const prev = live != null && ch != null ? live / (1 + ch / 100) : null;
  const abs = live != null && prev != null ? live - prev : null;

  return (
    <section aria-label="XAU/USD overview" className="hidden shrink-0 bg-card font-sans lg:block">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5">
        <XauUsdLogo size={22} />
        <span className="text-[16px] font-medium text-gc-ink">XAUUSD</span>
        <span className="text-[16px] font-medium tabular-nums text-gc-ink">
          {live != null ? num(live) : "—"}
          <span className="ml-0.5 text-[10px] font-normal text-gc-ink-muted">USD</span>
        </span>
        {abs != null && (
          <span className={cn("text-[14px] font-normal tabular-nums", pctTone(abs))}>
            {abs >= 0 ? "+" : "−"}
            {num(Math.abs(abs))} &nbsp;{pct(ch)}
          </span>
        )}
      </header>
      <nav aria-label="Gold sections" className="flex gap-6 border-b border-gc-line px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              "-mb-px border-b-2 py-3 text-[14px] font-medium transition-colors",
              tab === t.id ? "border-gc-ink text-gc-ink" : "border-transparent text-gc-ink-muted hover:text-gc-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="px-5 py-5">
        {tab === "news" && <NewsTab />}
        {tab === "technicals" && <TechnicalsTab bars={bars} timeframeKey={timeframeKey} />}
        {tab === "seasonals" && <SeasonalsTab />}
      </div>
    </section>
  );
}

/* ---------------- Overview ---------------- */

function fmtAxisTime(t: number, period: PeriodKey) {
  const d = new Date(t);
  if (period === "1d") return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  if (period === "5d" || period === "1m") return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (period === "5y" || period === "10y" || period === "all") return String(d.getUTCFullYear());
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function OverviewTab() {
  const [period, setPeriod] = useState<PeriodKey>("1d");
  const fetchOverview = useServerFn(getGoldOverview);
  const query = useQuery({
    queryKey: ["terminal-gold-overview", period],
    queryFn: () => fetchOverview({ data: { period } }),
    staleTime: 60_000,
    refetchInterval: period === "1d" ? 60_000 : false,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });
  const perf = query.data?.performance ?? null;
  const [lastPerf, setLastPerf] = useState<typeof perf>(null);
  if (perf && perf !== lastPerf) setLastPerf(perf);
  const shownPerf = perf ?? lastPerf;

  return (
    <div>
      <AreaChart points={query.data?.period === period ? query.data.points : []} prevClose={query.data?.prevClose ?? null} period={period} loading={query.isFetching} error={query.data?.error ?? null} />
      <div className="mt-10 grid grid-cols-5 gap-1 xl:grid-cols-10">
        {PERIODS.map((p) => {
          const v = shownPerf?.[p.key] ?? null;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              className={cn("px-2 py-2.5 text-center transition-colors", period === p.key ? "bg-gc-console-search" : "hover:bg-gc-console-search/60")}
            >
              <span className="block text-[13px] font-normal text-gc-ink">{p.label}</span>
              <span className={cn("block text-[13px] font-normal tabular-nums", pctTone(v))}>{pct(v)}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-gc-ink-muted">Gold history from COMEX gold futures; the chart above uses the Terminal's live gold feed.</p>
    </div>
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

function AreaChart({
  points,
  prevClose,
  period,
  loading,
  error,
}: {
  points: Array<[number, number]>;
  prevClose: number | null;
  period: PeriodKey;
  loading: boolean;
  error: string | null;
}) {
  const W = 1000;
  const H = 300;
  const boxRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const vals = points.map((p) => p[1]);
    if (prevClose) vals.push(prevClose);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    const pad = (max - min) * 0.08 || 1;
    min -= pad;
    max += pad;
    const t0 = points[0][0];
    const t1 = points[points.length - 1][0];
    const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * W;
    const y = (v: number) => H - ((v - min) / (max - min)) * H;
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
    const area = `${line}L${W},${H}L0,${H}Z`;
    const ticks = niceTicks(min, max);
    const xTicks = Array.from({ length: 7 }, (_, i) => t0 + ((t1 - t0) * i) / 6);
    return { x, y, line, area, ticks, xTicks, min, max };
  }, [points, prevClose]);

  const last = points.length ? points[points.length - 1][1] : null;
  const up = last != null && (prevClose ?? points[0]?.[1]) != null ? last >= (prevClose ?? points[0][1]) : true;
  const toneText = up ? "text-gc-green" : "text-gc-red";
  const hp = hover != null ? points[hover] : null;

  return (
    <div className="flex gap-3">
      <div
        ref={boxRef}
        className={cn("relative h-[300px] min-w-0 flex-1", toneText)}
        onMouseMove={(e) => {
          if (!geo || !boxRef.current) return;
          const r = boxRef.current.getBoundingClientRect();
          const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
          setHover(Math.round(f * (points.length - 1)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {geo ? (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label={`Gold price, ${period}`}>
            <defs>
              <linearGradient id="gold-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={geo.area} fill="url(#gold-area-fill)" />
            <path d={geo.line} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            {prevClose && (
              <line x1="0" x2={W} y1={geo.y(prevClose)} y2={geo.y(prevClose)} strokeDasharray="2 4" strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-gc-ink-muted" />
            )}
            {hp && <line x1={geo.x(hp[0])} x2={geo.x(hp[0])} y1="0" y2={H} strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-gc-ink-muted" strokeDasharray="3 3" />}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-gc-ink-muted">{error ?? (loading ? "Loading gold history…" : "No data")}</div>
        )}
        {geo && hp && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 whitespace-nowrap border border-gc-line bg-popover px-2 py-1 text-[11px] text-gc-ink shadow-sm"
            style={{ left: `${(geo.x(hp[0]) / W) * 100}%` }}
          >
            <span className="tabular-nums">{num(hp[1])}</span>
            <span className="ml-2 text-gc-ink-muted">{new Date(hp[0]).toLocaleString("en-US", { month: "short", day: "numeric", hour: period === "1d" || period === "5d" ? "2-digit" : undefined, minute: period === "1d" || period === "5d" ? "2-digit" : undefined, year: ["5y", "10y", "all"].includes(period) ? "numeric" : undefined, timeZone: "UTC" })}</span>
          </div>
        )}
        {geo && (
          <div className="pointer-events-none absolute -bottom-6 left-0 right-0 flex justify-between text-[11px] tabular-nums text-gc-ink-muted">
            {geo.xTicks.map((t) => (
              <span key={t}>{fmtAxisTime(t, period)}</span>
            ))}
          </div>
        )}
      </div>
      <div className="relative h-[300px] w-[84px] shrink-0 text-[11px] tabular-nums text-gc-ink-muted">
        {geo?.ticks.map((v) => (
          <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${(geo.y(v) / H) * 100}%` }}>
            {num(v, 0)}
          </span>
        ))}
        {geo && prevClose && (last == null || Math.abs(geo.y(prevClose) - geo.y(last)) > 16) && (
          <span className="absolute right-0 -translate-y-1/2 bg-gc-ink-muted px-1 text-background" style={{ top: `${(geo.y(prevClose) / H) * 100}%` }} title="Previous close">
            {num(prevClose)}
          </span>
        )}
        {geo && last != null && (
          <span className={cn("absolute right-0 -translate-y-1/2 px-1 text-gc-on-blue", up ? "bg-gc-green" : "bg-gc-red")} style={{ top: `${(geo.y(last) / H) * 100}%` }}>
            {num(last)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------------- News ---------------- */

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
