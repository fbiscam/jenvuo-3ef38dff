// News Impact: pure rules for the 24-release backtest, the surprise read and
// the signal. No network here so every number is reproducible and tested.

export type PairKey = "gold" | "eurusd" | "gbpjpy" | "dxy";

/** Tracked US releases. usdDir: +1 when a higher-than-forecast number is good for USD. */
export const NEWS_EVENTS = [
  { key: "nfp", label: "Non-Farm Payrolls", short: "NFP", title: "Non Farm Payrolls", usdDir: 1 },
  { key: "cpi", label: "Core CPI m/m", short: "CPI", title: "Core Inflation Rate MoM", usdDir: 1 },
  { key: "fomc", label: "FOMC Rate Decision", short: "FOMC", title: "Interest Rate", usdDir: 1 },
  { key: "pce", label: "Core PCE m/m", short: "PCE", title: "Core PCE Price Index MoM", usdDir: 1 },
  { key: "ppi", label: "PPI m/m", short: "PPI", title: "PPI MoM", usdDir: 1 },
  { key: "gdp", label: "GDP q/q (Advance)", short: "GDP", title: "GDP Growth Rate QoQ Adv", usdDir: 1 },
] as const;

export type NewsEventKey = (typeof NEWS_EVENTS)[number]["key"];
export const RELEASES_PER_EVENT = 24;

export function eventKeyForTitle(title: string): NewsEventKey | "other" {
  const hit = NEWS_EVENTS.find((e) => e.title === title);
  return hit ? hit.key : "other";
}

export function eventDef(key: string) {
  return NEWS_EVENTS.find((e) => e.key === key) ?? null;
}

/** Move after release measured from 5-minute candles (price units). */
export type FiveMinReaction = { base: number; t5: number; t15: number; t60: number; hi: number; lo: number };
/** Hourly-bar reaction (pairs without 5-minute history). */
export type HourReaction = { base: number; h1: number };
export type Reactions = {
  gold?: FiveMinReaction | null;
  eurusd?: FiveMinReaction | null;
  gbpjpy?: HourReaction | null;
  dxy?: HourReaction | null;
};

export type Candle = { t: number; o: number; h: number; l: number; c: number };

/** From 5m candles starting at the release: base = open of the release candle. */
export function fiveMinReaction(candles: Candle[], releaseMs: number): FiveMinReaction | null {
  const after = candles.filter((c) => c.t >= releaseMs && c.t < releaseMs + 60 * 60_000).sort((a, b) => a.t - b.t);
  if (after.length < 12 || after[0].t !== releaseMs) return null;
  const at = (min: number) => after.find((c) => c.t === releaseMs + (min - 5) * 60_000);
  const c5 = at(5), c15 = at(15), c60 = at(60);
  if (!c5 || !c15 || !c60) return null;
  const base = after[0].o;
  const hi = Math.max(...after.map((c) => c.h)) - base;
  const lo = Math.min(...after.map((c) => c.l)) - base;
  return { base, t5: c5.c - base, t15: c15.c - base, t60: c60.c - base, hi, lo };
}

/** Hourly bars: last close at or before the release to the first close ≥ 60 min after it. */
export function hourReaction(candles: Candle[], releaseMs: number): HourReaction | null {
  const H = 3_600_000;
  const sorted = [...candles].sort((a, b) => a.t - b.t);
  const before = [...sorted].reverse().find((c) => c.t + H <= releaseMs);
  const after = sorted.find((c) => c.t + H >= releaseMs + H);
  if (!before || !after || after.t - before.t > 4 * H) return null;
  return { base: before.c, h1: after.c - before.c };
}

export type Release = {
  id: string;
  event_key: string;
  released_at: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  unit?: string | null;
  scale?: string | null;
  reactions?: Reactions | null;
};

/** Actual minus forecast; FOMC has no consensus in the feed, so it compares to the previous rate. */
export function surpriseOf(r: Pick<Release, "event_key" | "actual" | "forecast" | "previous">): number | null {
  if (r.actual == null) return null;
  const ref = r.forecast ?? (r.event_key === "fomc" ? r.previous : null);
  if (ref == null) return null;
  return Math.round((r.actual - ref) * 1e6) / 1e6;
}

/** +1 USD-positive surprise, -1 USD-negative, 0 in line, null unknown. */
export function usdRead(eventKey: string, surprise: number | null): -1 | 0 | 1 | null {
  if (surprise == null) return null;
  if (surprise === 0) return 0;
  const dir = eventDef(eventKey)?.usdDir ?? 1;
  return (Math.sign(surprise) * dir) as -1 | 1;
}

export type Horizon = "t5" | "t15" | "t60";

export type MoveStats = {
  n: number;
  upPct: number;
  downPct: number;
  avgT5: number;
  avgT15: number;
  avgT60: number;
  avgAbsT15: number;
  avgRange: number;
  whipsawPct: number;
  continuationPct: number;
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (k: number, n: number) => (n ? Math.round((k / n) * 100) : 0);

/** Whipsaw: first 5 minutes and the hour close point opposite ways. */
export function isWhipsaw(r: FiveMinReaction): boolean {
  return r.t5 !== 0 && r.t60 !== 0 && Math.sign(r.t5) !== Math.sign(r.t60);
}

export function moveStats(rows: FiveMinReaction[], horizon: Horizon = "t15"): MoveStats {
  const n = rows.length;
  return {
    n,
    upPct: pct(rows.filter((r) => r[horizon] > 0).length, n),
    downPct: pct(rows.filter((r) => r[horizon] < 0).length, n),
    avgT5: avg(rows.map((r) => r.t5)),
    avgT15: avg(rows.map((r) => r.t15)),
    avgT60: avg(rows.map((r) => r.t60)),
    avgAbsT15: avg(rows.map((r) => Math.abs(r.t15))),
    avgRange: avg(rows.map((r) => r.hi - r.lo)),
    whipsawPct: pct(rows.filter(isWhipsaw).length, n),
    continuationPct: pct(rows.filter((r) => r.t5 !== 0 && Math.sign(r.t5) === Math.sign(r.t60)).length, n),
  };
}

export type Signal = "STRONG BUY" | "BUY" | "STRONG SELL" | "SELL" | "NEUTRAL VOLATILE" | "NO DATA";
export const MIN_SAMPLES = 5;

/** Direction from history only: ≥70% one way = strong, ≥60% = lean, otherwise neutral. */
export function signalFrom(stats: Pick<MoveStats, "n" | "upPct" | "downPct">): Signal {
  if (stats.n < MIN_SAMPLES) return "NO DATA";
  if (stats.upPct >= 70) return "STRONG BUY";
  if (stats.downPct >= 70) return "STRONG SELL";
  if (stats.upPct >= 60) return "BUY";
  if (stats.downPct >= 60) return "SELL";
  return "NEUTRAL VOLATILE";
}

/** Releases of one event with the same USD read as the given surprise. */
export function sameReadReactions(releases: Release[], eventKey: string, surprise: number, pair: "gold" | "eurusd" = "gold"): FiveMinReaction[] {
  const want = usdRead(eventKey, surprise);
  if (want == null) return [];
  return releases
    .filter((r) => r.event_key === eventKey && usdRead(eventKey, surpriseOf(r)) === want)
    .map((r) => r.reactions?.[pair])
    .filter((x): x is FiveMinReaction => !!x);
}

/** What-If: user forecast + expected actual -> historical Gold read for that kind of surprise. */
export function whatIf(releases: Release[], eventKey: string, forecast: number, actual: number) {
  const surprise = Math.round((actual - forecast) * 1e6) / 1e6;
  const read = usdRead(eventKey, surprise);
  const rows = sameReadReactions(releases, eventKey, surprise, "gold");
  const stats = moveStats(rows, "t15");
  return { surprise, read, stats, signal: signalFrom(stats) };
}

/** Newest first, at most `limit` releases of one event that already have an actual. */
export function lastReleases<R extends Release>(releases: R[], eventKey: string, nowMs: number, limit = RELEASES_PER_EVENT): R[] {
  return releases
    .filter((r) => r.event_key === eventKey && r.actual != null && Date.parse(r.released_at) <= nowMs)
    .sort((a, b) => Date.parse(b.released_at) - Date.parse(a.released_at))
    .slice(0, limit);
}

/** Share of releases where a pair moved the same way as Gold over the hour. */
export function sameDirectionPct(releases: Release[], pair: Exclude<PairKey, "gold">): { n: number; pct: number; avgAbs: number } {
  let n = 0, same = 0;
  const abs: number[] = [];
  for (const r of releases) {
    const g = r.reactions?.gold?.t60;
    const p = pair === "eurusd" ? r.reactions?.eurusd?.t60 : r.reactions?.[pair]?.h1;
    if (g == null || p == null || g === 0 || p === 0) continue;
    n++;
    if (Math.sign(g) === Math.sign(p)) same++;
    abs.push(Math.abs(p));
  }
  return { n, pct: pct(same, n), avgAbs: avg(abs) };
}

/** Parse "155K", "2.4%", "-0.1" into a number (no scaling; the feed already reports in its unit). */
export function parseNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
