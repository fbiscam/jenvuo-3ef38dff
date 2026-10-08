import { createServerFn } from "@tanstack/react-start";

export type NewsEvent = {
  title: string;
  country: string;
  date: string; // ISO
  impact: "High" | "Medium" | "Low";
  forecast?: string;
  previous?: string;
  minutesUntil: number;
};

type FFEvent = {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast?: string;
  previous?: string;
};

// Forex Factory weekly calendar — free, no key. The feed rate-limits, so the
// last good copy is kept in memory and reused when a fetch fails.
const FF_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const CACHE_MS = 10 * 60_000;
let cache: { at: number; raw: FFEvent[] } | null = null;

/** Gold moves on every USD release plus any high-impact event worldwide. */
function movesGold(e: FFEvent): boolean {
  const impact = (e.impact || "").toLowerCase();
  if (e.country === "USD" || e.country === "XAU") return impact === "high" || impact === "medium";
  return impact === "high" && (e.country === "CNY" || e.country === "EUR");
}

async function loadCalendar(): Promise<FFEvent[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.raw;
  try {
    const res = await fetch(FF_URL, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`calendar ${res.status}`);
    const raw = (await res.json()) as FFEvent[];
    if (!Array.isArray(raw)) throw new Error("calendar shape");
    cache = { at: Date.now(), raw };
    return raw;
  } catch (err) {
    if (cache) return cache.raw;
    throw err;
  }
}

export const getGoldNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsEvent[]> => {
    // Throwing (instead of returning []) lets the terminal say the feed is
    // unavailable rather than wrongly claiming there is no news.
    const raw = await loadCalendar();
    const now = Date.now();
    const horizon = now + 1000 * 60 * 60 * 24 * 8;
    return raw
      .filter(movesGold)
      .map((e) => {
        const t = new Date(e.date).getTime();
        const impact = /high/i.test(e.impact) ? "High" : /medium/i.test(e.impact) ? "Medium" : "Low";
        return {
          title: e.title,
          country: e.country,
          date: new Date(t).toISOString(),
          impact: impact as NewsEvent["impact"],
          forecast: e.forecast || undefined,
          previous: e.previous || undefined,
          minutesUntil: Math.round((t - now) / 60000),
        };
      })
      .filter((e) => {
        const t = new Date(e.date).getTime();
        return Number.isFinite(t) && t >= now - 1000 * 60 * 60 && t <= horizon;
      })
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .slice(0, 40);
  },
);
