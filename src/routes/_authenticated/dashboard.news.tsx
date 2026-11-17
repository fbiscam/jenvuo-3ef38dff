import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CalendarClock, Minus, Newspaper, RefreshCw, Zap } from "lucide-react";
import { getNewsImpact, type UpcomingRelease } from "@/lib/news-impact.functions";
import {
  RELEASES_PER_EVENT,
  eventDef,
  inPreNewsWindow,
  lastReleases,
  moveStats,
  outlookFrom,
  sameReadReactions,
  surpriseOf,
  usdRead,
  type FiveMinReaction,
  type Outlook,
} from "@/lib/news-impact";
import { readPageCache, writePageCache } from "@/lib/page-cache";
import { pollWhileVisible } from "@/lib/poll";

export const Route = createFileRoute("/_authenticated/dashboard/news")({
  head: () => ({
    meta: [
      { title: "News Impact — Jenvu" },
      { name: "description", content: "The next US high-impact release, its countdown and how Gold moved after the same kind of result in the last 24 releases." },
      { property: "og:title", content: "News Impact — Jenvu" },
      { property: "og:description", content: "Next US high-impact news with Gold UP / DOWN read and confidence from past releases." },
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
const fmtVal = (v: number | null, unit?: string | null, scale?: string | null) => (v == null ? "—" : `${v}${scale ?? ""}${unit ?? ""}`);
const fmtTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function countdown(ms: number) {
  if (ms <= 0) return "Released";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const sideWord = (o: Outlook) => (o.dir === "up" ? "UP" : o.dir === "down" ? "DOWN" : o.dir === "mixed" ? "mixed" : "unclear");

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

  const releases = data?.releases ?? [];
  const nextTracked = (data?.upcoming ?? []).find((u) => u.event_key !== "other" && Date.parse(u.released_at) > now - 2 * 3600_000);

  return (
    <div className="mx-auto w-full max-w-[900px] pb-10 text-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[30px] font-normal tracking-tight sm:text-[34px]">News Impact</h1>
          <p className="mt-1 max-w-[600px] text-[18px] text-muted-foreground">
            The next US high-impact news and which way Gold went after the same kind of result in the last {RELEASES_PER_EVENT} releases.
          </p>
        </div>
        <button type="button" onClick={() => void refetch()} aria-label="Refresh news data" className="console-pill self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {data?.feedError && (
        <div className="console-card mt-4 px-4 py-3 text-[13px] text-muted-foreground">The news feed did not answer this time; showing the last saved results.</div>
      )}

      <Hero next={nextTracked ?? null} releases={releases} now={now} loading={!data} />

      <p className="mt-6 text-[16px] leading-relaxed text-muted-foreground">
        Release results come from a public economic calendar. Gold reactions use 5-minute PAXG/USDT candles (a gold-backed token that tracks spot gold), measured from the open of the release candle. Past reactions do not guarantee future moves; spreads widen and slippage is common at release time.
      </p>
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
  const preWindow = inPreNewsWindow(t, now);
  const s = surpriseOf(next);
  const read = usdRead(next.event_key, s);
  const live = released && s != null ? outlookFrom(moveStats(sameReadReactions(history, next.event_key, s), "t15")) : null;
  const beat = outlookFrom(moveStats(sameReadReactions(history, next.event_key, def.usdDir), "t15"));
  const miss = outlookFrom(moveStats(sameReadReactions(history, next.event_key, -def.usdDir), "t15"));
  const all = history.map((r) => r.reactions?.gold).filter((x): x is FiveMinReaction => !!x);
  const allStats = moveStats(all, "t15");
  const overall = outlookFrom(allStats);
  return (
    <section className="console-card mt-6 p-5 sm:p-6">
      {preWindow && (
        <div
          className="mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-[14px] font-medium"
          style={{ borderColor: `${DOWN}66`, background: `${DOWN}12`, color: DOWN }}
          role="status"
        >
          <Zap className="h-4 w-4 shrink-0" /> Pre-news window: {def.short} in {Math.max(1, Math.ceil((t - now) / 60_000))}m · expectation read is live
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-muted-foreground"><Newspaper className="h-4 w-4" /> Next high-impact USD news</div>
          <div className="mt-2 text-[24px] font-medium sm:text-[28px]">{def.label}</div>
          <div className="mt-1 text-[13px] text-muted-foreground">{fmtTime(next.released_at)}</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-muted-foreground">{released ? "Released" : "Starts in"}</div>
          <div className="mt-1 font-mono text-[28px] tabular-nums sm:text-[34px]">{released ? fmtVal(next.actual, next.unit, next.scale) : countdown(t - now)}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[14px] tabular-nums">
        <span><span className="text-muted-foreground">Forecast </span><b className="font-medium">{fmtVal(next.forecast, next.unit, next.scale)}</b></span>
        <span><span className="text-muted-foreground">Previous </span><b className="font-medium">{fmtVal(next.previous, next.unit, next.scale)}</b></span>
        <span><span className="text-muted-foreground">Typical Gold move in 15 min </span><b className="font-medium">±${allStats.avgAbsT15.toFixed(2)}</b></span>
      </div>

      {live ? (
        <div className="mt-5">
          <OutlookCard
            big
            title={`Released: ${fmtVal(next.actual, next.unit, next.scale)} vs forecast ${fmtVal(next.forecast, next.unit, next.scale)} (${read === 0 ? "in line" : (read ?? 0) > 0 ? "beat, USD stronger" : "miss, USD weaker"})`}
            outlook={live}
          />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <OutlookCard title="If the number beats forecast (USD stronger)" outlook={beat} />
          <OutlookCard title="If the number misses forecast (USD weaker)" outlook={miss} />
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border/60 px-4 py-3 text-[14px] leading-relaxed">
        {live ? (
          <>
            <div>Verdict: after a {read === 0 ? "in-line" : (read ?? 0) > 0 ? "beat" : "miss"} like this, Gold went <b style={{ color: live.dir === "up" ? UP : live.dir === "down" ? DOWN : undefined }}>{sideWord(live)}</b>{live.dir === "up" || live.dir === "down" ? ` ${live.confidence}% of the time` : ""}.</div>
            <div className="text-muted-foreground">Typical 15-minute move {usd(live.avgMove)} · {live.n} past releases.</div>
          </>
        ) : (
          <>
            <div>
              Beat → Gold <b style={{ color: beat.dir === "up" ? UP : beat.dir === "down" ? DOWN : undefined }}>{sideWord(beat)}</b>{beat.dir === "up" || beat.dir === "down" ? ` (${beat.confidence}%, avg ${usd(beat.avgMove)})` : ""} · Miss → Gold{" "}
              <b style={{ color: miss.dir === "up" ? UP : miss.dir === "down" ? DOWN : undefined }}>{sideWord(miss)}</b>{miss.dir === "up" || miss.dir === "down" ? ` (${miss.confidence}%, avg ${usd(miss.avgMove)})` : ""}.
            </div>
            <div className="text-muted-foreground">
              Overall after {def.short}: Gold {overall.dir === "up" || overall.dir === "down" ? `${sideWord(overall)} ${overall.confidence}% of the time over the last ${overall.n} releases` : `has no clear side over the last ${overall.n} releases`}.
            </div>
          </>
        )}
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">
        Confidence = how often Gold went that way 15 minutes after the same kind of result in the last {RELEASES_PER_EVENT} releases. History, not a promise.
      </p>
    </section>
  );
}
