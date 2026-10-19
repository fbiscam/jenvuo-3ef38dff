/** Pure helpers for the Terminal overview: period performance, seasonals and news parsing. */

export type DailyClose = { t: number; c: number }; // t in ms (UTC)

export type PeriodKey = "1d" | "5d" | "1m" | "3m" | "6m" | "ytd" | "1y" | "5y" | "10y" | "all";

export const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "1d", label: "1 day" },
  { key: "5d", label: "5 days" },
  { key: "1m", label: "1 month" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
  { key: "ytd", label: "Year to date" },
  { key: "1y", label: "1 year" },
  { key: "5y", label: "5 years" },
  { key: "10y", label: "10 years" },
  { key: "all", label: "All time" },
];

const DAY = 86_400_000;

/** Start time of a period, measured back from `now`. */
export function periodStart(key: PeriodKey, now: number): number {
  const d = new Date(now);
  switch (key) {
    case "1d":
      return now - DAY;
    case "5d":
      return now - 5 * DAY;
    case "1m":
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, d.getUTCDate());
    case "3m":
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 3, d.getUTCDate());
    case "6m":
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 6, d.getUTCDate());
    case "ytd":
      return Date.UTC(d.getUTCFullYear(), 0, 1);
    case "1y":
      return Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate());
    case "5y":
      return Date.UTC(d.getUTCFullYear() - 5, d.getUTCMonth(), d.getUTCDate());
    case "10y":
      return Date.UTC(d.getUTCFullYear() - 10, d.getUTCMonth(), d.getUTCDate());
    case "all":
      return 0;
  }
}

/** Last close at or before `t` (the base a period is measured from). */
export function closeAtOrBefore(closes: DailyClose[], t: number): number | null {
  let found: number | null = null;
  for (const x of closes) {
    if (x.t <= t) found = x.c;
    else break;
  }
  return found;
}

/**
 * % change per period from sorted daily closes. 1 day uses the previous daily
 * close when given (matches the quote's daily change); "All time" uses the first close.
 */
export function periodPerformance(
  closes: DailyClose[],
  now: number,
  prevClose: number | null = null,
): Record<PeriodKey, number | null> {
  const out = {} as Record<PeriodKey, number | null>;
  const last = closes.length ? closes[closes.length - 1].c : null;
  for (const { key } of PERIODS) {
    if (last == null) {
      out[key] = null;
      continue;
    }
    let base: number | null;
    if (key === "1d" && prevClose) base = prevClose;
    else if (key === "all") base = closes[0].c;
    else base = closeAtOrBefore(closes, periodStart(key, now));
    out[key] = base ? ((last - base) / base) * 100 : null;
  }
  return out;
}

export type SeasonalSeries = { year: number; points: Array<[number, number]>; last: number };

/**
 * Per-year cumulative % change from the year's base close (last close of the
 * previous year, or the year's first close), keyed by day of year (0-365).
 */
export function seasonalSeries(closes: DailyClose[], years: number[]): SeasonalSeries[] {
  const out: SeasonalSeries[] = [];
  for (const year of years) {
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    const inYear = closes.filter((x) => x.t >= start && x.t < end);
    if (!inYear.length) continue;
    const base = closeAtOrBefore(closes, start - 1) ?? inYear[0].c;
    const points: Array<[number, number]> = inYear.map((x) => [Math.floor((x.t - start) / DAY), ((x.c - base) / base) * 100]);
    out.push({ year, points, last: points[points.length - 1][1] });
  }
  return out;
}

export type Headline = { title: string; link: string; source: string; publishedAt: string };

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

/** Parse an RSS feed (Google News format: "Headline - Source"). Only http(s) links are kept. */
export function parseRssHeadlines(xml: string, limit = 15): Headline[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const out: Headline[] = [];
  for (const item of items) {
    const tag = (name: string) => {
      const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`));
      return m ? decode(m[1]) : "";
    };
    let title = tag("title");
    const link = tag("link");
    let source = tag("source");
    const pub = tag("pubDate");
    if (!title || !/^https?:\/\//.test(link)) continue;
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    else if (!source) {
      const i = title.lastIndexOf(" - ");
      if (i > 0) {
        source = title.slice(i + 3);
        title = title.slice(0, i);
      }
    }
    const date = new Date(pub);
    out.push({ title, link, source: source || "News", publishedAt: Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString() });
    if (out.length >= limit) break;
  }
  return out;
}
