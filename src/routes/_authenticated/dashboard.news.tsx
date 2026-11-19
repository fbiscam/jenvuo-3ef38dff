import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Activity, ArrowDown, ArrowUp, CalendarClock, CalendarDays, History, Minus, Newspaper, RefreshCw, Zap } from "lucide-react";
import { getNewsImpact, type UpcomingRelease } from "@/lib/news-impact.functions";
import {
  NEWS_EVENTS,
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
const UP = "var(--pl-up)";
const DOWN = "var(--pl-down)";
const tint = (c: string, pct: number) => `color-mix(in oklab, ${c} ${pct}%, transparent)`;
const toneOf = (dir: string) => (dir === "up" ? "pl-up" : dir === "down" ? "pl-down" : "");
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
        </div>
        <button type="button" onClick={() => void refetch()} aria-label="Refresh news data" className="console-pill self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground lg:whitespace-nowrap lg:text-[18px]">
        <span className="block lg:inline">The next US high-impact news and which way Gold went</span>{" "}
        <span className="block lg:inline">after the same kind of result in the last {RELEASES_PER_EVENT} releases.</span>
      </p>

      {data?.feedError && (
        <div className="console-card mt-4 px-4 py-3 text-[14px] text-muted-foreground">The news feed did not answer this time; showing the last saved results.</div>
      )}

      <Hero next={nextTracked ?? null} releases={releases} now={now} loading={!data} />

      <WeekCalendar upcoming={data?.upcoming ?? []} now={now} loading={!data} nextId={nextTracked?.id ?? null} />
      <EventReactions releases={releases} now={now} loading={!data} />
      <RecentResults releases={releases} now={now} loading={!data} />
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
      style={color ? { borderColor: tint(color, 40), background: tint(color, 7) } : undefined}
    >
      <div className="text-[14px] text-muted-foreground">{title}</div>
      <div className={`mt-3 flex items-center gap-3 ${toneOf(dir)}`}>
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-full ${big ? "h-16 w-16" : "h-14 w-14"}`}
          style={color ? { background: tint(color, 14) } : undefined}
        >
          <Icon className={big ? "h-9 w-9" : "h-8 w-8"} strokeWidth={2.5} />
        </span>
        <div>
          <div className={`font-semibold leading-none tracking-tight ${big ? "text-[40px]" : "text-[34px]"}`}>{word}</div>
          {dir !== "none" && <div className="mt-1.5 text-[15px] font-medium tabular-nums">{confidence}% confidence</div>}
        </div>
      </div>
      <div className="mt-4 text-[14px] text-muted-foreground tabular-nums">
        {dir === "none"
          ? `Only ${n} past result${n === 1 ? "" : "s"} like this, not enough to read.`
          : `Avg Gold move ${usd(avgMove)} in 15 min · ${n} past releases`}
      </div>
    </div>
  );
}

function Hero({ next, releases, now, loading }: { next: UpcomingRelease | null; releases: UpcomingRelease[]; now: number; loading: boolean }) {
  if (loading) return <section className="console-card mt-6 min-h-[260px] p-5 text-[14px] text-muted-foreground">Loading the next release…</section>;
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
          className="pl-down mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-[14px] font-medium"
          style={{ borderColor: tint(DOWN, 40), background: tint(DOWN, 7) }}
          role="status"
        >
          <Zap className="h-4 w-4 shrink-0" /> Pre-news window: {def.short} in {Math.max(1, Math.ceil((t - now) / 60_000))}m · expectation read is live
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[13px] uppercase tracking-wider text-muted-foreground"><Newspaper className="h-4 w-4" /> Next high-impact USD news</div>
          <div className="mt-2 text-[24px] font-medium sm:text-[28px]">{def.label}</div>
          <div className="mt-1 text-[14px] text-muted-foreground">{fmtTime(next.released_at)}</div>
        </div>
        <div className="text-right">
          <div className="text-[13px] text-muted-foreground">{released ? "Released" : "Starts in"}</div>
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
            <div>Verdict: after a {read === 0 ? "in-line" : (read ?? 0) > 0 ? "beat" : "miss"} like this, Gold went <b className={toneOf(live.dir)}>{sideWord(live)}</b>{live.dir === "up" || live.dir === "down" ? ` ${live.confidence}% of the time` : ""}.</div>
            <div className="text-muted-foreground">Typical 15-minute move {usd(live.avgMove)} · {live.n} past releases.</div>
          </>
        ) : (
          <>
            <div>
              Beat → Gold <b className={toneOf(beat.dir)}>{sideWord(beat)}</b>{beat.dir === "up" || beat.dir === "down" ? ` (${beat.confidence}%, avg ${usd(beat.avgMove)})` : ""} · Miss → Gold{" "}
              <b className={toneOf(miss.dir)}>{sideWord(miss)}</b>{miss.dir === "up" || miss.dir === "down" ? ` (${miss.confidence}%, avg ${usd(miss.avgMove)})` : ""}.
            </div>
            <div className="text-muted-foreground">
              Overall after {def.short}: Gold {overall.dir === "up" || overall.dir === "down" ? `${sideWord(overall)} ${overall.confidence}% of the time over the last ${overall.n} releases` : `has no clear side over the last ${overall.n} releases`}.
            </div>
          </>
        )}
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">
        Confidence = how often Gold went that way 15 minutes after the same kind of result in the last {RELEASES_PER_EVENT} releases. History, not a promise.
      </p>
    </section>
  );
}

function SectionHead({ icon: Icon, title, sub }: { icon: typeof Newspaper; title: string; sub: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-[18px] font-medium tracking-tight sm:text-[20px]">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" /> {title}
        </h2>
        <p className="mt-0.5 text-[14px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

const dayKey = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** Section 2: every US high-impact release in the next 8 days, grouped by day. */
function WeekCalendar({ upcoming, now, loading, nextId }: { upcoming: UpcomingRelease[]; now: number; loading: boolean; nextId: string | null }) {
  const groups = new Map<string, UpcomingRelease[]>();
  for (const u of upcoming) {
    const k = dayKey(u.released_at);
    groups.set(k, [...(groups.get(k) ?? []), u]);
  }
  return (
    <section className="mt-10">
      <SectionHead icon={CalendarDays} title="This week's calendar" sub="US high-impact releases in the next 8 days, in your local time." />
      {loading ? (
        <div className="console-card h-[180px] animate-pulse" />
      ) : groups.size === 0 ? (
        <div className="console-card p-5 text-[14px] text-muted-foreground">No US high-impact releases scheduled in the next 8 days.</div>
      ) : (
        <div className="console-card divide-y divide-border overflow-hidden">
          {Array.from(groups, ([day, items]) => (
            <div key={day} className="grid gap-3 p-4 sm:grid-cols-[150px_1fr] sm:p-5">
              <div className="text-[14px] font-medium text-muted-foreground">{day}</div>
              <ul className="space-y-2">
                {items.map((u) => {
                  const def = eventDef(u.event_key);
                  const t = Date.parse(u.released_at);
                  const done = u.actual != null && t <= now;
                  const isNext = u.id === nextId;
                  return (
                    <li
                      key={u.id}
                      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3 py-2.5 ${isNext ? "bg-background ring-1 ring-foreground/15" : ""}`}
                    >
                      <span className="w-[80px] shrink-0 whitespace-nowrap font-mono text-[14px] tabular-nums">{clock(u.released_at)}</span>
                      <span className="min-w-0 flex-1 text-[14px] font-medium">
                        {u.title}
                        {def && <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wider text-background">{def.short}</span>}
                      </span>
                      <span className="text-[13px] tabular-nums text-muted-foreground">
                        F {fmtVal(u.forecast, u.unit, u.scale)} · P {fmtVal(u.previous, u.unit, u.scale)}
                      </span>
                      <span className="w-[104px] text-right font-mono text-[13px] tabular-nums">
                        {done ? <>A {fmtVal(u.actual, u.unit, u.scale)}</> : t <= now ? "Waiting" : countdown(t - now)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Section 3: how Gold moved 15 minutes after each tracked release type. */
function EventReactions({ releases, now, loading }: { releases: UpcomingRelease[]; now: number; loading: boolean }) {
  return (
    <section className="mt-10">
      <SectionHead icon={Activity} title="How Gold reacts" sub={`Gold 15 minutes after each release, last ${RELEASES_PER_EVENT} of each.`} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NEWS_EVENTS.map((e) => {
          const history = lastReleases(releases, e.key, now);
          const rows = history.map((r) => r.reactions?.gold).filter((x): x is FiveMinReaction => !!x);
          const st = moveStats(rows, "t15");
          const o = outlookFrom(st);
          return (
            <div key={e.key} className="console-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">{e.short}</div>
                  <div className="mt-0.5 text-[15px] font-medium">{e.label}</div>
                </div>
                {loading ? null : (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${toneOf(o.dir)}`}
                    style={o.dir === "up" || o.dir === "down" ? { background: tint(o.dir === "up" ? UP : DOWN, 14) } : undefined}
                  >
                    {o.dir === "up" ? "Leans UP" : o.dir === "down" ? "Leans DOWN" : o.dir === "mixed" ? "Mixed" : "No data"}
                  </span>
                )}
              </div>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-background" aria-hidden="true">
                <div className="bg-pl-up transition-[width] duration-700" style={{ width: loading ? 0 : `${st.upPct}%` }} />
                <div className="ml-auto bg-pl-down transition-[width] duration-700" style={{ width: loading ? 0 : `${st.downPct}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[13px] tabular-nums">
                <span className="pl-up font-medium">{st.upPct}% up</span>
                <span className="pl-down font-medium">{st.downPct}% down</span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-[13px] tabular-nums">
                <div>
                  <dt className="text-muted-foreground">Avg move</dt>
                  <dd className="mt-0.5 text-[14px] font-medium">±${st.avgAbsT15.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Whipsaw</dt>
                  <dd className="mt-0.5 text-[14px] font-medium">{st.whipsawPct}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Releases</dt>
                  <dd className="mt-0.5 text-[14px] font-medium">{st.n}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Section 4: the latest tracked results, beat or miss, and what Gold did. */
function RecentResults({ releases, now, loading }: { releases: UpcomingRelease[]; now: number; loading: boolean }) {
  const recent = releases
    .filter((r) => r.actual != null && Date.parse(r.released_at) <= now && r.reactions?.gold)
    .sort((a, b) => Date.parse(b.released_at) - Date.parse(a.released_at))
    .slice(0, 8);
  return (
    <section className="mt-10">
      <SectionHead icon={History} title="Latest results" sub="The most recent tracked releases and how far Gold moved." />
      {loading ? (
        <div className="console-card h-[220px] animate-pulse" />
      ) : recent.length === 0 ? (
        <div className="console-card p-5 text-[14px] text-muted-foreground">No measured releases yet.</div>
      ) : (
        <div className="console-card overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_repeat(3,0.7fr)] gap-3 border-b border-border px-5 py-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Release</span><span>Actual / forecast</span><span>Result</span><span className="text-right">5 min</span><span className="text-right">15 min</span><span className="text-right">1 hour</span>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((r) => {
              const def = eventDef(r.event_key);
              const g = r.reactions!.gold!;
              const read = usdRead(r.event_key, surpriseOf(r));
              const result = read == null ? "—" : read === 0 ? "In line" : read > 0 ? "Beat" : "Miss";
              const move = (v: number) => <span className={`font-medium ${v > 0 ? "pl-up" : v < 0 ? "pl-down" : ""}`}>{usd(v)}</span>;
              return (
                <li key={r.id} className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-5 py-3.5 text-[14px] tabular-nums sm:grid-cols-[1.4fr_1fr_0.8fr_repeat(3,0.7fr)] sm:items-center">
                  <div className="col-span-2 sm:col-span-1">
                    <div className="font-medium">{def?.label ?? r.title}</div>
                    <div className="text-[13px] text-muted-foreground">{new Date(r.released_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                  <div>{fmtVal(r.actual, r.unit, r.scale)} <span className="text-muted-foreground">/ {fmtVal(r.forecast, r.unit, r.scale)}</span></div>
                  <div>
                    <span className="rounded-full bg-background px-2.5 py-0.5 text-[13px] font-medium">{result}</span>
                  </div>
                  <div className="sm:text-right"><span className="text-muted-foreground sm:hidden">5m </span>{move(g.t5)}</div>
                  <div className="sm:text-right"><span className="text-muted-foreground sm:hidden">15m </span>{move(g.t15)}</div>
                  <div className="sm:text-right"><span className="text-muted-foreground sm:hidden">1h </span>{move(g.t60)}</div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[13px] text-muted-foreground">Past Gold moves after each release. History, not a promise.</p>
    </section>
  );
}
