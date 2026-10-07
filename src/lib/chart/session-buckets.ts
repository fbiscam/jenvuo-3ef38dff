/**
 * TradingView-style session bucketing for gold.
 *
 * Gold's trading day opens at 17:00 New York time, and TradingView starts
 * every 45m / 2H / 4H / 1D candle from that session open (DST aware). Exchange
 * feeds bucket from UTC midnight instead, so their 4H and daily candles cover
 * different hours and look nothing like TradingView's.
 *
 * Browser- and server-safe (only uses Intl).
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SESSION_OPEN_HOUR = 17;

let fmt: Intl.DateTimeFormat | null = null;
const offsetCache = new Map<number, number>();

/** New York UTC offset in ms at instant t (e.g. -4h in summer, -5h in winter). */
export function nyOffsetMs(t: number): number {
  const key = Math.floor(t / HOUR);
  const cached = offsetCache.get(key);
  if (cached != null) return cached;
  fmt ??= new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(key * HOUR))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const local = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
  const off = Math.round((local - key * HOUR) / 60_000) * 60_000;
  if (offsetCache.size > 20_000) offsetCache.clear();
  offsetCache.set(key, off);
  return off;
}

/** UTC instant of the 17:00 New York session open at or before t. */
export function sessionAnchor(t: number): number {
  const local = t + nyOffsetMs(t);
  let a = Math.floor(local / DAY) * DAY + SESSION_OPEN_HOUR * HOUR;
  if (local < a) a -= DAY;
  return a - nyOffsetMs(a - nyOffsetMs(t));
}

/**
 * Bucket start (ms) for a candle at t. Timeframes up to 1H are identical to
 * plain UTC bucketing; 45m / 2H / 4H restart at each session open. Daily
 * candles cover 17:00 → 17:00 New York and are labelled at UTC midnight of
 * their trading date, like TradingView.
 */
export function sessionBucketMs(t: number, stepMs: number): number {
  if (stepMs <= HOUR && HOUR % stepMs === 0) return Math.floor(t / stepMs) * stepMs;
  const anchor = sessionAnchor(t);
  if (stepMs >= DAY) {
    const local = anchor + nyOffsetMs(anchor) + DAY; // next calendar day = trading date
    return Math.floor(local / DAY) * DAY;
  }
  return anchor + Math.floor((t - anchor) / stepMs) * stepMs;
}
