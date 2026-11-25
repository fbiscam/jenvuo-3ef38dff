import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getMarketSnapshotsBatch, getTerminalChart } from "@/lib/gold-analysis.functions";
import { getGoldOverview, getGoldSeasonals } from "@/lib/terminal-overview.functions";
import type { NewsEvent } from "@/lib/news.functions";
import type { OhlcvBar } from "@/lib/chart/indicators";
import type { PeriodKey } from "@/lib/chart/gold-history";
import { technicalSummary } from "@/lib/chart/technicals";
import { isMarketClosed } from "@/lib/signals/qualification";
import { cn } from "@/lib/utils";
import { AssetLogo, CHART_ASSETS, assetInfo, hasWeekendClose, type ChartAsset } from "./terminal-assets";

/** "Seasonal Data & Market Info" side panel (TradingView symbol-overview style). */

const UP = "text-[#089981]";
const DOWN = "text-[#f23645]";
const CATEGORY: Record<ChartAsset, string> = { XAUUSD: "Commodity", BTCUSD: "Crypto", EURUSD: "Forex" };
const PERF: Array<{ key: PeriodKey; label: string }> = [
  { key: "5d", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Y" },
];
const MONTH_DAY = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const SEASON_STROKE = ["text-foreground", "text-season-1", "text-season-3"];
const SEASON_DOT = ["bg-foreground", "bg-season-1", "bg-season-3"];

const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const compact = (v: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);

function newsStamp(iso: string): string {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  const abs = Math.abs(mins);
  const span = abs < 60 ? `${abs} min` : abs < 1440 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} d`;
  return mins >= 0 ? `in ${span}` : `${span} ago`;
}

/** Large price with the last digit raised, like TradingView. */
function BigPrice({ value, decimals, tone }: { value: number; decimals: number; tone?: string }) {
  const text = fmt(value, decimals);
  const split = decimals >= 4;
  return (
    <span className={cn("text-[30px] font-semibold leading-none tabular-nums transition-colors", tone || "text-foreground")}>
      {split ? text.slice(0, -1) : text}
      {split && <sup className="ml-px align-super text-[16px]">{text.slice(-1)}</sup>}
    </span>
  );
}

function Gauge({ score, rating }: { score: number; rating: string }) {
  // score -1..1 → needle from left (180°) to right (0°)
  const angle = Math.PI - ((Math.max(-1, Math.min(1, score)) + 1) / 2) * Math.PI;
  const cx = 100;
  const cy = 96;
  const r = 78;
  const seg = (i: number) => {
    const a0 = Math.PI - (i / 5) * Math.PI - 0.03;
    const a1 = Math.PI - ((i + 1) / 5) * Math.PI + 0.03;
    const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy - r * Math.sin(a)).toFixed(1)}`;
    return `M${p(a0)} A${r},${r} 0 0 1 ${p(a1)}`;
  };
  const tone = rating.includes("buy") || rating.includes("Buy") ? UP : rating.includes("ell") ? DOWN : "text-muted-foreground";
  const segTone = ["text-[#f23645]", "text-[#f23645]/50", "text-muted-foreground/40", "text-[#089981]/50", "text-[#089981]"];
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 112" className="w-full max-w-[230px]" role="img" aria-label={`Technical rating ${rating}`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={seg(i)} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" className={segTone[i]} />
        ))}
        <line
          x1={cx}
          y1={cy}
          x2={cx + (r - 18) * Math.cos(angle)}
          y2={cy - (r - 18) * Math.sin(angle)}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-foreground transition-all duration-700"
        />
        <circle cx={cx} cy={cy} r="5" className="fill-foreground" />
      </svg>
      <div className="-mt-1 flex w-full max-w-[230px] justify-between text-[10px] text-muted-foreground">
        <span>Strong sell</span>
        <span>Neutral</span>
        <span>Strong buy</span>
      </div>
      <p className={cn("mt-2 text-[15px] font-semibold", tone)}>{rating}</p>
    </div>
  );
}

export function TerminalWatchlist({
  asset,
  onAssetChange,
  news,
  upcomingNews = [],
  newsLoading,
  newsFailed,
  className,
}: {
  asset: ChartAsset;
  onAssetChange: (asset: ChartAsset) => void;
  news?: NewsEvent;
  upcomingNews?: NewsEvent[];
  newsLoading: boolean;
  newsFailed?: boolean;
  onClose: () => void;
  className?: string;
}) {
  const info = assetInfo(asset);
  const fetchBatch = useServerFn(getMarketSnapshotsBatch);
  const fetchOverview = useServerFn(getGoldOverview);
  const fetchSeasonals = useServerFn(getGoldSeasonals);
  const fetchChart = useServerFn(getTerminalChart);
  const [moreNews, setMoreNews] = useState(false);

  const quote = useQuery({
    queryKey: ["terminal-info-quote", asset],
    queryFn: async () => {
      const res = await fetchBatch({ data: { symbols: [asset] } });
      return res?.results?.find((r) => r.symbol === asset)?.snapshot ?? null;
    },
    staleTime: 1_000,
    refetchInterval: 2_000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });
  // Same key as the Overview tab so both share one cached request.
  const overview = useQuery({
    queryKey: ["terminal-overview", asset, "1d"],
    queryFn: () => fetchOverview({ data: { period: "1d", asset } }),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
  });
  const seasonals = useQuery({
    queryKey: ["terminal-seasonals", asset],
    queryFn: () => fetchSeasonals({ data: { asset } }),
    staleTime: 30 * 60_000,
  });
  const daily = useQuery({
    queryKey: ["terminal-info-daily", asset],
    queryFn: () => fetchChart({ data: { timeframe: "1d", asset } }),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
  });

  const bars = ((daily.data as { bars?: OhlcvBar[] } | undefined)?.bars ?? []) as OhlcvBar[];
  const tech = useMemo(() => (bars.length > 31 ? technicalSummary(bars.slice(0, -1)) : null), [bars]);
  const volume = useMemo(() => {
    if (bars.length < 5) return null;
    const today = bars[bars.length - 1]?.volume ?? 0;
    const prior = bars.slice(-31, -1).map((b) => b.volume).filter((v) => Number.isFinite(v) && v > 0);
    if (!today || !prior.length) return null;
    const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
    return { today, avg };
  }, [bars]);

  const q = quote.data;
  const [tickDir, setTickDir] = useState<"up" | "down" | null>(null);
  const lastPrice = useRef<number | null>(null);
  useEffect(() => {
    const p = q?.price;
    if (p == null || !Number.isFinite(p)) return;
    const prev = lastPrice.current;
    lastPrice.current = p;
    if (prev == null || prev === p) return;
    setTickDir(p > prev ? "up" : "down");
    const t = setTimeout(() => setTickDir(null), 1200);
    return () => clearTimeout(t);
  }, [q?.price]);
  const change = q && q.prevClose != null ? q.price - q.prevClose : null;
  const closed = hasWeekendClose(asset) && isMarketClosed(new Date());
  const perf = overview.data?.performance ?? null;

  const series = (seasonals.data?.series ?? []).slice(-3).reverse(); // current year first
  const W = 300;
  const H = 120;
  const geo = useMemo(() => {
    if (!series.length) return null;
    const all = series.flatMap((s) => s.points.map((p) => p[1]));
    let min = Math.min(0, ...all);
    let max = Math.max(0, ...all);
    const pad = (max - min) * 0.08 || 1;
    min -= pad;
    max += pad;
    return { x: (d: number) => (d / 365) * W, y: (v: number) => H - ((v - min) / (max - min)) * H };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonals.data, asset]);

  return (
    <aside
      aria-label="Seasonal Data & Market Info"
      className={cn("min-h-0 w-[330px] shrink-0 flex-col border-l border-terminal-line dark:border-border bg-card text-card-foreground", className)}
    >
      <div className="sidebar-hover-scroll watchlist-scroll min-h-0 flex-1 overflow-y-auto">
        {/* Market switch */}
        <div className="flex gap-1 border-b border-terminal-line dark:border-border px-3 py-2">
          {CHART_ASSETS.map((a) => (
            <button
              key={a.symbol}
              type="button"
              onClick={() => onAssetChange(a.symbol)}
              aria-pressed={a.symbol === asset}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
                a.symbol === asset ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <AssetLogo asset={a.symbol} size={14} />
              {a.label}
            </button>
          ))}
        </div>

        {/* Symbol identity + price */}
        <section className="border-b border-terminal-line dark:border-border px-4 py-4">
          <div className="flex items-center gap-2.5">
            <AssetLogo asset={asset} size={32} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight text-foreground">{asset}</p>
              <p className="truncate text-[12px] text-muted-foreground">
                {info.title} · {CATEGORY[asset]}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            {q ? <BigPrice value={q.price} decimals={info.decimals} tone={tickDir === "up" ? UP : tickDir === "down" ? DOWN : undefined} /> : <span className="text-[30px] font-semibold leading-none">—</span>}
            <span className="text-[11px] text-muted-foreground">USD</span>
          </div>
          {q && change != null && (
            <p className={cn("mt-1.5 text-[14px] font-medium tabular-nums", change >= 0 ? UP : DOWN)}>
              {change >= 0 ? "+" : ""}
              {fmt(change, Math.min(info.decimals, 3))} {q.changePct != null && pct(q.changePct)}
            </p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className={cn("h-1.5 w-1.5 rounded-full", closed ? "bg-muted-foreground" : "bg-[#089981]")} />
            {closed ? "Market closed" : "Market open"}
          </p>
        </section>

        {/* Volume vs average */}
        <section className="border-b border-terminal-line dark:border-border px-4 py-4">
          {volume ? (
            <>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Volume</span>
                <span className="text-muted-foreground">Avg. volume (30D)</span>
              </div>
              <div className="mt-0.5 flex justify-between text-[14px] font-medium tabular-nums text-foreground">
                <span>{compact(volume.today)}</span>
                <span>{compact(volume.avg)}</span>
              </div>
              <div className="mt-2 flex h-[5px] gap-[2px]">
                <span
                  className="h-full rounded-l-full bg-[#2962FF]"
                  style={{ width: `${Math.max(2, Math.min(98, (volume.today / (volume.today + volume.avg)) * 100))}%` }}
                />
                <span className="h-full flex-1 rounded-r-full bg-[#22C4D8]" />
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">Feed volume, not centralized market order flow.</p>
            </>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              {daily.isPending ? "Loading volume…" : "Volume isn't published for this market."}
            </p>
          )}
        </section>

        {/* News */}
        <section className="border-b border-terminal-line dark:border-border px-4 py-4">
          <div className="rounded-xl bg-secondary p-3">
            <p className="text-[11px] text-muted-foreground">
              {news ? `${news.country} · ${news.impact} impact · ${newsStamp(news.date)}` : "Economic calendar"}
            </p>
            <p className="mt-1 text-[13px] font-medium leading-5 text-foreground">
              {newsLoading
                ? "Checking news…"
                : news
                  ? news.title
                  : newsFailed
                    ? "News feed unavailable — check the calendar before trading"
                    : "No important news ahead"}
            </p>
            {news && (news.forecast || news.previous) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {news.forecast ? `Forecast ${news.forecast}` : ""}
                {news.forecast && news.previous ? " · " : ""}
                {news.previous ? `Previous ${news.previous}` : ""}
              </p>
            )}
            {upcomingNews.length > 1 && (
              <button
                type="button"
                onClick={() => setMoreNews((v) => !v)}
                className="mt-2 inline-flex items-center gap-0.5 text-[12px] font-medium text-foreground hover:underline"
                aria-expanded={moreNews}
              >
                {moreNews ? "Fewer events" : "More events"}
                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", moreNews && "rotate-90")} />
              </button>
            )}
            {moreNews && (
              <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
                {upcomingNews.slice(1).map((e) => (
                  <li key={`${e.date}-${e.title}`} className="flex items-start gap-1.5 text-[11px]">
                    <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", e.impact === "High" ? "bg-[#f23645]" : "bg-orange-500")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-foreground">{e.country} · {e.title}</span>
                      <span className="text-muted-foreground">{newsStamp(e.date)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Performance */}
        <section className="border-b border-terminal-line dark:border-border px-4 py-4">
          <h3 className="text-[14px] font-semibold text-foreground">Performance</h3>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {PERF.map((p) => {
              const v = perf?.[p.key] ?? null;
              return (
                <div
                  key={p.key}
                  className={cn(
                    "rounded-lg px-2 py-2 text-center",
                    v == null ? "bg-secondary" : v >= 0 ? "bg-[#089981]/10" : "bg-[#f23645]/10",
                  )}
                >
                  <p className={cn("text-[13px] font-semibold tabular-nums", v == null ? "text-muted-foreground" : v >= 0 ? UP : DOWN)}>
                    {v == null ? "—" : pct(v)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{p.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Seasonals */}
        <section className="border-b border-terminal-line dark:border-border px-4 py-4">
          <h3 className="text-[14px] font-semibold text-foreground">Seasonals</h3>
          {!geo ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              {seasonals.data?.error ?? "Loading seasonal history…"}
            </p>
          ) : (
            <>
              <div className="mt-3 flex gap-3 text-[11px] text-muted-foreground">
                {series.map((s, i) => (
                  <span key={s.year} className="flex items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-full", SEASON_DOT[i])} />
                    {s.year}
                  </span>
                ))}
              </div>
              <div className="relative mt-2 h-[120px]">
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label={`${info.label} seasonal performance`}>
                  <line x1="0" x2={W} y1={geo.y(0)} y2={geo.y(0)} strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" className="stroke-border" />
                  {[...series].reverse().map((s) => {
                    const i = series.indexOf(s);
                    const d = s.points.map((p, j) => `${j ? "L" : "M"}${geo.x(p[0]).toFixed(1)},${geo.y(p[1]).toFixed(1)}`).join("");
                    return (
                      <path key={s.year} d={d} fill="none" stroke="currentColor" strokeWidth={i === 0 ? 2 : 1.2} vectorEffect="non-scaling-stroke" className={SEASON_STROKE[i]} />
                    );
                  })}
                </svg>
              </div>
              <div className="relative mt-1 h-4 text-[10px] text-muted-foreground">
                {[0, 4, 8].map((m) => (
                  <span key={m} className="absolute" style={{ left: `${(MONTH_DAY[m]! / 365) * 100}%` }}>
                    {["Jan", "May", "Sep"][m / 4]}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Past yearly patterns only, not a forecast.</p>
            </>
          )}
        </section>

        {/* Technicals */}
        <section className="px-4 py-4">
          <h3 className="text-[14px] font-semibold text-foreground">Technicals</h3>
          <p className="text-[11px] text-muted-foreground">Daily candles · display only, not a trade signal</p>
          <div className="mt-3">
            {tech ? (
              <Gauge score={tech.score} rating={tech.rating} />
            ) : (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                {daily.isPending ? "Loading technicals…" : "Technicals unavailable right now."}
              </p>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
