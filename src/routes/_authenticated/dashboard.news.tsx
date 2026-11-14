import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowUp, CalendarClock, Minus, FlaskConical, Newspaper, RefreshCw, Radar } from "lucide-react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { getNewsImpact, type UpcomingRelease } from "@/lib/news-impact.functions";
import {
  NEWS_EVENTS,
  RELEASES_PER_EVENT,
  eventDef,
  lastReleases,
  moveStats,
  outlookFrom,
  sameDirectionPct,
  sameReadReactions,
  surpriseOf,
  usdRead,
  whatIf,
  type FiveMinReaction,
  type NewsEventKey,
  type Outlook,
  type Signal,
} from "@/lib/news-impact";
import { readPageCache, writePageCache } from "@/lib/page-cache";
import { pollWhileVisible } from "@/lib/poll";

export const Route = createFileRoute("/_authenticated/dashboard/news")({
  head: () => ({
    meta: [
      { title: "News Impact — Jenvu" },
      { name: "description", content: "How Gold, EUR/USD, GBP/JPY and the dollar reacted to the last 24 US high-impact releases, with a What-If simulator." },
      { property: "og:title", content: "News Impact — Jenvu" },
      { property: "og:description", content: "24-release backtest of Gold reactions to NFP, CPI, FOMC, PCE, PPI and GDP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewsImpactPage,
});

type NewsData = Awaited<ReturnType<typeof getNewsImpact>>;
const UP = "#2a9d8f";
const DOWN = "#e76f51";
const CACHE = "news-impact";

const usd = (n: number, d = 2) => `${n > 0 ? "+" : n < 0 ? "−" : ""}$${Math.abs(n).toFixed(d)}`;
const signed = (n: number, d = 1, suffix = "") => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(d)}${suffix}`;
const tone = (n: number | null | undefined) => (n == null || n === 0 ? "" : n > 0 ? "text-[#2a9d8f]" : "text-[#e76f51]");
const fmtVal = (v: number | null, unit?: string | null, scale?: string | null) => (v == null ? "—" : `${v}${scale ?? ""}${unit ?? ""}`);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" });
const fmtTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function countdown(ms: number) {
  if (ms <= 0) return "Released";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function SignalBadge({ signal }: { signal: Signal }) {
  const buy = signal.includes("BUY"), sell = signal.includes("SELL");
  const color = buy ? UP : sell ? DOWN : undefined;
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold tracking-wide"
      style={color ? { borderColor: color, color, background: `${color}14` } : undefined}
    >
      {signal === "NO DATA" ? "NOT ENOUGH DATA" : signal}
    </span>
  );
}

function NewsImpactPage() {
  const fetchNews = useServerFn(getNewsImpact);
  const qc = useQueryClient();
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["news-impact"],
    queryFn: async () => {
      const r = await fetchNews();
      void writePageCache(CACHE, r);
      return r;
    },
    staleTime: 30_000,
    refetchInterval: (q) => ((q.state.data as NewsData | undefined)?.pending ? 1500 : false),
  });
  useEffect(() => {
    void readPageCache<NewsData>(CACHE).then((c) => {
      if (c && !qc.getQueryData(["news-impact"])) qc.setQueryData(["news-impact"], c);
    });
    return pollWhileVisible(() => void refetch(), 60_000);
  }, [qc, refetch]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => pollWhileVisible(() => setNow(Date.now()), 1000), []);
  const [eventKey, setEventKey] = useState<NewsEventKey>("nfp");

  const releases = data?.releases ?? [];
  const def = eventDef(eventKey)!;
  const rows = useMemo(() => lastReleases(releases, eventKey, now), [releases, eventKey, now]);
  const gold = rows.map((r) => r.reactions?.gold).filter((x): x is FiveMinReaction => !!x);
  const stats = moveStats(gold, "t15");
  const chart = [...rows].reverse().map((r) => ({ d: fmtDate(r.released_at), v: r.reactions?.gold ? Math.round(r.reactions.gold.t15 * 100) / 100 : 0 }));

  const nextTracked = (data?.upcoming ?? []).find((u) => u.event_key !== "other" && Date.parse(u.released_at) > now - 2 * 3600_000);

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-10 text-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[30px] font-normal tracking-tight sm:text-[34px]">News Impact</h1>
          <p className="mt-1 max-w-[640px] text-[14px] text-muted-foreground">
            How Gold and the main USD pairs actually moved after the last {RELEASES_PER_EVENT} US high-impact releases. History, not a promise.
          </p>
        </div>
        <button type="button" onClick={() => void refetch()} aria-label="Refresh news data" className="console-pill self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {data?.feedError && (
        <div className="console-card mt-4 px-4 py-3 text-[13px] text-muted-foreground">The news feed did not answer this time; showing the last saved results.</div>
      )}
      {!!data?.pending && (
        <div className="console-card mt-4 flex items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" /> Measuring price reactions for {data.pending} more past releases…
        </div>
      )}

      <Hero next={nextTracked ?? null} releases={releases} now={now} loading={!data} />

      {/* Event picker */}
      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="News event">
        {NEWS_EVENTS.map((e) => (
          <button
            key={e.key}
            type="button"
            role="tab"
            aria-selected={eventKey === e.key}
            onClick={() => setEventKey(e.key)}
            className={eventKey === e.key ? "console-pill-solid" : "console-pill"}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Releases tested" value={data ? `${gold.length}` : "…"} sub={`of last ${RELEASES_PER_EVENT}`} />
        <Kpi label="Avg Gold T+5m" value={data ? usd(stats.avgT5) : "…"} toneValue={stats.avgT5} />
        <Kpi label="Avg Gold T+15m" value={data ? usd(stats.avgT15) : "…"} toneValue={stats.avgT15} sub={`±${usd(stats.avgAbsT15).replace(/^[+−]/, "")} typical`} />
        <Kpi label="Avg Gold T+60m" value={data ? usd(stats.avgT60) : "…"} toneValue={stats.avgT60} />
        <Kpi label="Avg 60m range" value={data ? `$${stats.avgRange.toFixed(2)}` : "…"} sub="high to low" />
        <Kpi label="Whipsaw rate" value={data ? `${stats.whipsawPct}%` : "…"} sub={`${stats.continuationPct}% continued`} />
      </div>

      {/* Chart */}
      <section className="console-card mt-2 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-muted-foreground">Gold move 15 minutes after each {def.short} release</div>
          <div className="text-[12px] text-muted-foreground">oldest → newest</div>
        </div>
        <div className="mt-3 h-[220px]">
          {chart.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <RTooltip
                  cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }}
                  contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number) => [usd(v), "Gold T+15m"]}
                />
                <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                  {chart.map((c, i) => <Cell key={i} fill={c.v >= 0 ? UP : DOWN} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">{data ? "No measured releases yet." : "Loading…"}</div>
          )}
        </div>
      </section>

      {/* Table */}
      <h2 className="mt-10 flex items-center gap-2 text-[20px] font-medium"><Activity className="h-5 w-5" /> {def.label}: last {RELEASES_PER_EVENT} releases</h2>
      <div className="console-card mt-3 overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead className="text-left text-[12px] text-muted-foreground">
            <tr>
              {["Date", "Actual", "Forecast", "Previous", "Surprise", "USD read", "Gold T+5m", "Gold T+15m", "Gold T+60m", "60m high / low", "EUR/USD T+15m"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = surpriseOf(r);
              const read = usdRead(r.event_key, s);
              const g = r.reactions?.gold;
              const e = r.reactions?.eurusd;
              return (
                <tr key={r.id} className="console-row tabular-nums">
                  <td className="whitespace-nowrap px-3 py-2.5">{fmtDate(r.released_at)}</td>
                  <td className="px-3 py-2.5 font-medium">{fmtVal(r.actual, r.unit, r.scale)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtVal(r.forecast, r.unit, r.scale)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtVal(r.previous, r.unit, r.scale)}</td>
                  <td className={`px-3 py-2.5 ${tone(s == null ? null : s * def.usdDir)}`}>{s == null ? "—" : `${s > 0 ? "+" : ""}${s}${r.scale ?? ""}${r.unit ?? ""}`}</td>
                  <td className="px-3 py-2.5">{read == null ? "—" : read === 0 ? "In line" : read > 0 ? "USD +" : "USD −"}</td>
                  <td className={`px-3 py-2.5 ${tone(g?.t5)}`}>{g ? usd(g.t5) : "—"}</td>
                  <td className={`px-3 py-2.5 font-medium ${tone(g?.t15)}`}>{g ? usd(g.t15) : "—"}</td>
                  <td className={`px-3 py-2.5 ${tone(g?.t60)}`}>{g ? usd(g.t60) : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{g ? `${usd(g.hi)} / ${usd(g.lo)}` : "—"}</td>
                  <td className={`px-3 py-2.5 ${tone(e?.t15)}`}>{e ? signed(e.t15 * 10000, 1, " pips") : "—"}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">{data ? "No releases found yet." : "Loading…"}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <WhatIf eventKey={eventKey} releases={releases} lastForecast={rows[0]?.forecast ?? null} />
        <Correlation rows={rows} />
      </div>

      <Calendar upcoming={data?.upcoming ?? []} now={now} />

      <p className="mt-8 text-[12px] leading-relaxed text-muted-foreground">
        Release results come from a public economic calendar. Gold reactions use 5-minute PAXG/USDT candles (a gold-backed token that tracks spot gold), EUR/USD uses 5-minute EUR/USDT candles, GBP/JPY and the Dollar Index use hourly bars. Moves are measured from the open of the release candle. Past reactions do not guarantee future moves; spreads widen and slippage is common at release time.
      </p>
    </div>
  );
}

function Kpi({ label, value, sub, toneValue }: { label: string; value: string; sub?: string; toneValue?: number }) {
  return (
    <div className="console-card p-4">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[20px] font-medium tabular-nums ${tone(toneValue)}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function OutlookCard({ title, outlook, big }: { title: string; outlook: Outlook; big?: boolean }) {
  const { dir, confidence, avgMove, n } = outlook;
  const color = dir === "up" ? UP : dir === "down" ? DOWN : undefined;
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  const word = dir === "up" ? "UP" : dir === "down" ? "DOWN" : dir === "mixed" ? "MIXED" : "NO DATA";
  return (
    <div
      className="rounded-2xl border p-5"
      style={color ? { borderColor: `${color}66`, background: `${color}12` } : undefined}
    >
      <div className="text-[13px] text-muted-foreground">{title}</div>
      <div className="mt-3 flex items-center gap-3" style={color ? { color } : undefined}>
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-full ${big ? "h-16 w-16" : "h-14 w-14"}`}
          style={color ? { background: `${color}22` } : undefined}
        >
          <Icon className={big ? "h-9 w-9" : "h-8 w-8"} strokeWidth={2.5} />
        </span>
        <div>
          <div className={`font-semibold leading-none tracking-tight ${big ? "text-[40px]" : "text-[34px]"}`}>{word}</div>
          {dir !== "none" && <div className="mt-1.5 text-[15px] font-medium tabular-nums">{confidence}% confidence</div>}
        </div>
      </div>
      <div className="mt-4 text-[13px] text-muted-foreground tabular-nums">
        {dir === "none"
          ? `Only ${n} past result${n === 1 ? "" : "s"} like this, not enough to read.`
          : `Avg Gold move ${usd(avgMove)} in 15 min · ${n} past releases`}
      </div>
    </div>
  );
}

function Hero({ next, releases, now, loading }: { next: UpcomingRelease | null; releases: UpcomingRelease[]; now: number; loading: boolean }) {
  if (loading) return <section className="console-card mt-6 min-h-[260px] p-5 text-[13px] text-muted-foreground">Loading the next release…</section>;
  if (!next) {
    return (
      <section className="console-card mt-6 flex items-center gap-3 p-5 text-[14px] text-muted-foreground">
        <CalendarClock className="h-5 w-5" /> No tracked US high-impact release in the next 8 days.
      </section>
    );
  }
  const def = eventDef(next.event_key)!;
  const t = Date.parse(next.released_at);
  const history = lastReleases(releases, next.event_key, now);
  const released = next.actual != null && t <= now;
  const s = surpriseOf(next);
  const live = released && s != null ? sameReadReactions(history, next.event_key, s) : [];
  const liveStats = moveStats(live, "t15");
  const all = history.map((r) => r.reactions?.gold).filter((x): x is FiveMinReaction => !!x);
  const allStats = moveStats(all, "t15");
  return (
    <section className="console-card mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-muted-foreground"><Newspaper className="h-4 w-4" /> Next high-impact USD release</div>
          <div className="mt-2 text-[24px] font-medium sm:text-[28px]">{def.label}</div>
          <div className="mt-1 text-[13px] text-muted-foreground">{fmtTime(next.released_at)}</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-muted-foreground">{released ? "Released" : "Starts in"}</div>
          <div className="mt-1 font-mono text-[28px] tabular-nums sm:text-[34px]">{released ? fmtVal(next.actual, next.unit, next.scale) : countdown(t - now)}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[13px] tabular-nums">
        <span><span className="text-muted-foreground">Forecast </span>{fmtVal(next.forecast, next.unit, next.scale)}</span>
        <span><span className="text-muted-foreground">Previous </span>{fmtVal(next.previous, next.unit, next.scale)}</span>
        <span><span className="text-muted-foreground">Typical Gold move (T+15m) </span>±${allStats.avgAbsT15.toFixed(2)}</span>
        <span><span className="text-muted-foreground">Typical 60m range </span>${allStats.avgRange.toFixed(2)}</span>
      </div>
      {released && s != null ? (
        <div className="mt-5">
          <OutlookCard
            big
            title={`Released: ${fmtVal(next.actual, next.unit, next.scale)} vs forecast ${fmtVal(next.forecast, next.unit, next.scale)} (${usdRead(next.event_key, s) === 0 ? "in line" : (usdRead(next.event_key, s) ?? 0) > 0 ? "beat, USD stronger" : "miss, USD weaker"})`}
            outlook={outlookFrom(liveStats)}
          />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <OutlookCard title="If the number beats forecast (USD stronger)" outlook={outlookFrom(moveStats(sameReadReactions(history, next.event_key, def.usdDir), "t15"))} />
          <OutlookCard title="If the number misses forecast (USD weaker)" outlook={outlookFrom(moveStats(sameReadReactions(history, next.event_key, -def.usdDir), "t15"))} />
        </div>
      )}
      <p className="mt-3 text-[12px] text-muted-foreground">
        Confidence = how often Gold went that way 15 minutes after the same kind of result in the last {RELEASES_PER_EVENT} releases. History, not a promise.
      </p>
    </section>
  );
}

function WhatIf({ eventKey, releases, lastForecast }: { eventKey: NewsEventKey; releases: UpcomingRelease[]; lastForecast: number | null }) {
  const [forecast, setForecast] = useState("");
  const [actual, setActual] = useState("");
  useEffect(() => {
    setForecast(lastForecast == null ? "" : String(lastForecast));
    setActual("");
  }, [eventKey, lastForecast]);
  const f = Number(forecast), a = Number(actual);
  const ok = forecast.trim() !== "" && actual.trim() !== "" && Number.isFinite(f) && Number.isFinite(a);
  const history = lastReleases(releases, eventKey, Date.now());
  const res = ok ? whatIf(history, eventKey, f, a) : null;
  const def = eventDef(eventKey)!;
  const input = "h-10 w-full rounded-xl border border-border bg-background px-3 text-[14px] tabular-nums outline-none focus:border-foreground";
  return (
    <section className="console-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[15px] font-medium"><FlaskConical className="h-4 w-4" /> What-If simulator · {def.short}</div>
      <p className="mt-1 text-[12px] text-muted-foreground">Type the forecast and the number you expect. We look up every past {def.short} with the same kind of surprise.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-[12px] text-muted-foreground">Forecast<input inputMode="decimal" className={`${input} mt-1`} value={forecast} onChange={(e) => setForecast(e.target.value)} /></label>
        <label className="text-[12px] text-muted-foreground">Expected actual<input inputMode="decimal" className={`${input} mt-1`} value={actual} onChange={(e) => setActual(e.target.value)} placeholder="e.g. 120" /></label>
      </div>
      {res ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <span>Surprise <b className={tone(res.surprise * def.usdDir)}>{res.surprise > 0 ? "+" : ""}{res.surprise}</b> · {res.read === 0 ? "in line" : (res.read ?? 0) > 0 ? "USD positive" : "USD negative"}</span>
            {res.read !== 0 && <SignalBadge signal={res.signal} />}
          </div>
          {res.read === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">An in-line number has no surprise to compare; expect the typical range without a clear direction.</p>
          ) : (
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[13px] tabular-nums">
              <dt className="text-muted-foreground">Gold up / down (T+15m)</dt><dd className="text-right">{res.stats.upPct}% / {res.stats.downPct}%</dd>
              <dt className="text-muted-foreground">Avg T+5m / T+15m / T+60m</dt><dd className="text-right">{usd(res.stats.avgT5)} / {usd(res.stats.avgT15)} / {usd(res.stats.avgT60)}</dd>
              <dt className="text-muted-foreground">Avg 60m range</dt><dd className="text-right">${res.stats.avgRange.toFixed(2)}</dd>
              <dt className="text-muted-foreground">Whipsaw rate</dt><dd className="text-right">{res.stats.whipsawPct}%</dd>
              <dt className="text-muted-foreground">Similar past releases</dt><dd className="text-right">{res.stats.n}</dd>
            </dl>
          )}
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-muted-foreground">Enter both numbers to see the historical read.</p>
      )}
    </section>
  );
}

function Correlation({ rows }: { rows: UpcomingRelease[] }) {
  const gold = rows.map((r) => r.reactions?.gold).filter((x): x is FiveMinReaction => !!x);
  const g = moveStats(gold, "t60");
  const pairs = [
    { key: "eurusd" as const, name: "EUR/USD", fmt: (v: number) => `${(v * 10000).toFixed(1)} pips`, note: "5-minute data, T+60m" },
    { key: "gbpjpy" as const, name: "GBP/JPY", fmt: (v: number) => `${(v * 100).toFixed(1)} pips`, note: "hourly bars" },
    { key: "dxy" as const, name: "Dollar Index", fmt: (v: number) => `${v.toFixed(2)} pts`, note: "hourly bars" },
  ];
  return (
    <section className="console-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[15px] font-medium"><Radar className="h-4 w-4" /> Multi-pair reaction</div>
      <p className="mt-1 text-[12px] text-muted-foreground">How often each market moved the same way as Gold over the hour after these releases.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border/60 p-3">
          <div className="text-[13px] font-medium">XAU/USD</div>
          <div className="mt-1 text-[12px] text-muted-foreground">Avg |T+60m|</div>
          <div className="text-[18px] tabular-nums">${gold.length ? (gold.reduce((a, r) => a + Math.abs(r.t60), 0) / gold.length).toFixed(2) : "0.00"}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Up {g.upPct}% · Down {g.downPct}%</div>
        </div>
        {pairs.map((p) => {
          const c = sameDirectionPct(rows, p.key);
          const inverse = c.n > 0 && c.pct < 50;
          return (
            <div key={p.key} className="rounded-2xl border border-border/60 p-3">
              <div className="text-[13px] font-medium">{p.name}</div>
              <div className="mt-1 text-[12px] text-muted-foreground">{inverse ? "Opposite to Gold" : "Same as Gold"}</div>
              <div className="text-[18px] tabular-nums" style={{ color: c.n ? (inverse ? DOWN : UP) : undefined }}>{c.n ? `${inverse ? 100 - c.pct : c.pct}%` : "—"}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{c.n ? `avg move ${p.fmt(c.avgAbs)} · ${c.n} releases · ${p.note}` : "No overlapping data"}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Calendar({ upcoming, now }: { upcoming: UpcomingRelease[]; now: number }) {
  return (
    <>
      <h2 className="mt-10 flex items-center gap-2 text-[20px] font-medium"><CalendarClock className="h-5 w-5" /> US high-impact calendar</h2>
      <div className="console-card mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-[13px]">
          <thead className="text-left text-[12px] text-muted-foreground">
            <tr>{["Time", "Event", "Actual", "Forecast", "Previous", "Status"].map((h) => <th key={h} className="px-3 py-3 font-normal">{h}</th>)}</tr>
          </thead>
          <tbody>
            {upcoming.map((u) => {
              const t = Date.parse(u.released_at);
              const s = surpriseOf(u);
              const def = eventDef(u.event_key);
              return (
                <tr key={u.id} className="console-row tabular-nums">
                  <td className="whitespace-nowrap px-3 py-2.5">{fmtTime(u.released_at)}</td>
                  <td className="px-3 py-2.5">{u.title}{def && <span className="console-badge ml-2">tracked</span>}</td>
                  <td className={`px-3 py-2.5 font-medium ${tone(s == null ? null : s * (def?.usdDir ?? 1))}`}>{fmtVal(u.actual, u.unit, u.scale)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtVal(u.forecast, u.unit, u.scale)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtVal(u.previous, u.unit, u.scale)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{t > now ? countdown(t - now) : u.actual != null ? "Released" : "Waiting for result"}</td>
                </tr>
              );
            })}
            {!upcoming.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No high-impact US releases in the next 8 days.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
