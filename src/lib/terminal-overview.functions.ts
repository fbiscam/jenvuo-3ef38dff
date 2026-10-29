import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseRssHeadlines, periodPerformance, seasonalSeries, type DailyClose, type Headline, type PeriodKey } from "@/lib/chart/gold-history";

const UA = "Mozilla/5.0";
const HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const SYMBOL = "GC=F";

/** Chart interval/range used for the overview line per period. */
const RANGE: Record<PeriodKey, { interval: string; range: string }> = {
  "1d": { interval: "5m", range: "1d" },
  "5d": { interval: "30m", range: "5d" },
  "1m": { interval: "1h", range: "1mo" },
  "3m": { interval: "1d", range: "3mo" },
  "6m": { interval: "1d", range: "6mo" },
  ytd: { interval: "1d", range: "ytd" },
  "1y": { interval: "1d", range: "1y" },
  "5y": { interval: "1wk", range: "5y" },
  "10y": { interval: "1wk", range: "10y" },
  all: { interval: "1mo", range: "max" },
};

type YahooSeries = { points: DailyClose[]; prevClose: number | null; price: number | null };

const cache = new Map<string, { at: number; data: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const data = await load();
  cache.set(key, { at: Date.now(), data });
  return data;
}

async function fetchTimeout(url: string, ms = 8000, headers: Record<string, string> = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA, ...headers } });
  } finally {
    clearTimeout(timer);
  }
}

/** Cached per interval/range so the 1-day line and the daily change share one request. */
function yahooSeries(interval: string, range: string): Promise<YahooSeries> {
  const ttl = interval === "5m" || interval === "30m" ? 60_000 : 15 * 60_000;
  return cached(`y:${interval}:${range}`, ttl, () => yahooSeriesRaw(interval, range));
}

async function yahooSeriesRaw(interval: string, range: string): Promise<YahooSeries> {
  let lastErr: unknown = null;
  for (const host of HOSTS) {
    try {
      const res = await fetchTimeout(`https://${host}/v8/finance/chart/${encodeURIComponent(SYMBOL)}?interval=${interval}&range=${range}`);
      if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        throw new Error(`status ${res.status}`);
      }
      const json: any = await res.json();
      const r = json?.chart?.result?.[0];
      const ts: number[] = r?.timestamp ?? [];
      const close: Array<number | null> = r?.indicators?.quote?.[0]?.close ?? [];
      const points: DailyClose[] = [];
      for (let i = 0; i < ts.length; i++) {
        const c = close[i];
        if (typeof c === "number" && Number.isFinite(c) && c > 0) points.push({ t: ts[i] * 1000, c });
      }
      if (points.length < 2) throw new Error("too few points");
      const meta = r?.meta ?? {};
      const prev = typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose : typeof meta.previousClose === "number" ? meta.previousClose : null;
      const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
      return { points, prevClose: prev, price };
    } catch (e) {
      lastErr = e;
    }
  }
  console.error("terminal-overview: gold history unavailable", lastErr);
  throw new Error("Gold history is unavailable right now.");
}

/** 10 years of daily closes (longer ranges come back monthly), shared by performance and seasonals. */
function dailyHistory() {
  return yahooSeries("1d", "10y");
}

/** Overview line for one period plus % change for every period. */
export const getGoldOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { period?: string }) => {
    const p = String(d?.period ?? "1d") as PeriodKey;
    return { period: (p in RANGE ? p : "1d") as PeriodKey };
  })
  .handler(async ({ data }) => {
    try {
      const cfg = RANGE[data.period];
      // Sequential: parallel bursts get rate-limited by the price source.
      const line = await yahooSeries(cfg.interval, cfg.range);
      const today = await yahooSeries("5m", "1d");
      const daily = await dailyHistory();
      const monthly = await yahooSeries("1mo", "max");
      const now = Date.now();
      // Monthly closes before the daily window give "All time" its real start.
      const firstDaily = daily.points[0]?.t ?? Infinity;
      const closes = [...monthly.points.filter((p) => p.t < firstDaily), ...daily.points];
      const live = today.price ?? today.points[today.points.length - 1]?.c;
      if (live) closes.push({ t: now, c: live });
      return {
        period: data.period,
        points: line.points.map((p) => [p.t, p.c] as [number, number]),
        prevClose: data.period === "1d" ? today.prevClose : line.points[0]?.c ?? null,
        performance: periodPerformance(closes, now, today.prevClose),
        error: null as string | null,
      };
    } catch {
      return { period: data.period, points: [], prevClose: null, performance: null, error: "Gold history is unavailable right now." };
    }
  });

/** Year-by-year % path of gold (seasonality), last 6 calendar years. */
export const getGoldSeasonals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const daily = await dailyHistory();
      const year = new Date().getUTCFullYear();
      const years = Array.from({ length: 6 }, (_, i) => year - 5 + i);
      return { series: seasonalSeries(daily.points, years), error: null as string | null };
    } catch {
      return { series: [], error: "Seasonal history is unavailable right now." };
    }
  });

/** Headline feeds tried in order; the first one that returns items wins. */
const HEADLINE_FEEDS = [
  "https://news.google.com/rss/search?q=XAUUSD+OR+gold+price+when:2d&hl=en-US&gl=US&ceid=US:en",
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC%3DF&region=US&lang=en-US",
  "https://www.bing.com/news/search?q=gold+price+XAUUSD&format=rss",
  "https://news.google.com/rss/search?q=gold+price&hl=en-GB&gl=GB&ceid=GB:en",
];
let lastGoodHeadlines: Headline[] = [];

async function loadHeadlines(): Promise<Headline[]> {
  for (const url of HEADLINE_FEEDS) {
    try {
      const res = await fetchTimeout(url, 6000, { Accept: "application/rss+xml, application/xml, text/xml" });
      if (!res.ok) { await res.body?.cancel().catch(() => {}); continue; }
      const items = parseRssHeadlines(await res.text(), 20);
      if (items.length) return items;
    } catch (e) {
      console.error("terminal-overview: headline feed failed", url, e);
    }
  }
  throw new Error("all headline feeds failed");
}

/** Latest gold headlines (several RSS feeds with fallback; keeps the last good list). */
export const getGoldHeadlines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const items = await cached<Headline[]>("headlines", 5 * 60_000, loadHeadlines);
      lastGoodHeadlines = items;
      return { items, error: null as string | null };
    } catch (e) {
      console.error("terminal-overview: headlines unavailable", e);
      if (lastGoodHeadlines.length) return { items: lastGoodHeadlines, error: null as string | null };
      return { items: [] as Headline[], error: "Headlines are unavailable right now." };
    }
  });
