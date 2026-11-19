// News Impact data: real US release results (TradingView economic calendar)
// and measured price reactions (Binance 5m PAXG + EURUSDT, Yahoo hourly
// GBPJPY + DXY). Results are stored once in news_releases and reused.
import { eventKeyForTitle, fiveMinReaction, hourReaction, parseNum, type Candle, type Reactions } from "./news-impact";

type TvEvent = {
  id: string;
  title: string;
  date: string;
  importance: number;
  actual: unknown;
  forecast: unknown;
  previous: unknown;
  unit?: string | null;
  scale?: string | null;
};

const TV_URL = "https://economic-calendar.tradingview.com/events";
const BACKFILL_MONTHS = 38; // 24 FOMC decisions need about 3 years
const RECENT_SYNC_MS = 10 * 60_000;
const BATCH = 10; // releases measured per call (keeps outbound requests small)
const RETRY_MS = 6 * 3600_000; // retry a missing Gold move at most this often
let lastRecentSync = 0;
let hourCache: { at: number; gbpjpy: Candle[]; dxy: Candle[] } | null = null;

async function tvRange(from: Date, to: Date): Promise<TvEvent[]> {
  const url = `${TV_URL}?from=${from.toISOString()}&to=${to.toISOString()}&countries=US`;
  const res = await fetch(url, {
    headers: { Origin: "https://www.tradingview.com", Referer: "https://www.tradingview.com/", "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  const j = (await res.json()) as { result?: TvEvent[] };
  return (j.result ?? []).filter((e) => e.importance === 1);
}

function toRow(e: TvEvent) {
  return {
    id: String(e.id),
    event_key: eventKeyForTitle(e.title),
    title: e.title,
    released_at: new Date(e.date).toISOString(),
    actual: parseNum(e.actual),
    forecast: parseNum(e.forecast),
    previous: parseNum(e.previous),
    unit: e.unit ?? null,
    scale: e.scale ?? null,
    updated_at: new Date().toISOString(),
  };
}

async function upsertEvents(db: any, events: TvEvent[]) {
  const seen = new Map<string, ReturnType<typeof toRow>>();
  for (const e of events) if (e?.id && e.date) seen.set(String(e.id), toRow(e));
  const rows = [...seen.values()];
  for (let i = 0; i < rows.length; i += 200) {
    await db.from("news_releases").upsert(rows.slice(i, i + 200), { onConflict: "id" });
  }
}

/** Backfill ~3 years once, then refresh the last 10 days + next 14 days every 10 minutes. */
export async function syncCalendar(db: any): Promise<void> {
  const { count } = await db.from("news_releases").select("id", { count: "exact", head: true }).eq("event_key", "fomc");
  const now = Date.now();
  if ((count ?? 0) < 20) {
    const tasks: Promise<TvEvent[]>[] = [];
    const start = new Date(now);
    start.setUTCMonth(start.getUTCMonth() - BACKFILL_MONTHS, 1);
    for (let d = new Date(start); d.getTime() < now; ) {
      const e = new Date(d);
      e.setUTCMonth(e.getUTCMonth() + 3);
      tasks.push(tvRange(d, e).catch(() => []));
      d = e;
    }
    await upsertEvents(db, (await Promise.all(tasks)).flat());
    lastRecentSync = 0;
  }
  if (now - lastRecentSync < RECENT_SYNC_MS) return;
  lastRecentSync = now;
  try {
    await upsertEvents(db, await tvRange(new Date(now - 10 * 86400000), new Date(now + 14 * 86400000)));
  } catch {
    /* keep the stored copy */
  }
}

type Row = unknown[];
const num = (v: unknown) => Number(v);

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(7_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** 5-minute candles for the hour after `startMs`. Binance first, then OKX and KuCoin:
 *  Binance refuses some server regions, which left every Gold move empty. */
export async function fiveMin(base: "PAXG" | "EUR", startMs: number): Promise<Candle[]> {
  const endMs = startMs + 60 * 60_000;
  for (const host of ["data-api.binance.vision", "api.binance.com", "api1.binance.com"]) {
    const rows = await getJson(`https://${host}/api/v3/klines?symbol=${base}USDT&interval=5m&startTime=${startMs}&limit=12`);
    if (Array.isArray(rows) && rows.length) return (rows as Row[]).map((r) => ({ t: num(r[0]), o: num(r[1]), h: num(r[2]), l: num(r[3]), c: num(r[4]) }));
  }
  if (base !== "PAXG") return [];
  const okx = await getJson(`https://www.okx.com/api/v5/market/history-candles?instId=PAXG-USDT&bar=5m&after=${endMs}&before=${startMs - 1}&limit=20`);
  if (Array.isArray(okx?.data) && okx.data.length) {
    return (okx.data as Row[]).map((r) => ({ t: num(r[0]), o: num(r[1]), h: num(r[2]), l: num(r[3]), c: num(r[4]) }));
  }
  const s = Math.floor(startMs / 1000);
  const ku = await getJson(`https://api.kucoin.com/api/v1/market/candles?type=5min&symbol=PAXG-USDT&startAt=${s}&endAt=${s + 3600}`);
  if (Array.isArray(ku?.data) && ku.data.length) {
    // KuCoin rows are [time(s), open, close, high, low, ...]
    return (ku.data as Row[]).map((r) => ({ t: num(r[0]) * 1000, o: num(r[1]), c: num(r[2]), h: num(r[3]), l: num(r[4]) }));
  }
  return [];
}

async function yahooHourly(symbol: string): Promise<Candle[]> {
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const res = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1h&range=2y`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36", Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const j: any = await res.json();
      const r = j?.chart?.result?.[0];
      const ts: number[] = r?.timestamp ?? [];
      const q = r?.indicators?.quote?.[0] ?? {};
      const out: Candle[] = [];
      for (let i = 0; i < ts.length; i++) {
        const c = Number(q.close?.[i]);
        if (Number.isFinite(c) && c > 0) out.push({ t: ts[i] * 1000, o: Number(q.open?.[i]), h: Number(q.high?.[i]), l: Number(q.low?.[i]), c });
      }
      if (out.length) return out;
    } catch {
      /* next host */
    }
  }
  return [];
}

async function hourly() {
  if (hourCache && Date.now() - hourCache.at < 60 * 60_000) return hourCache;
  const [gbpjpy, dxy] = await Promise.all([yahooHourly("GBPJPY=X"), yahooHourly("DX-Y.NYB")]);
  hourCache = { at: Date.now(), gbpjpy, dxy };
  return hourCache;
}

/** Measure reactions for up to BATCH released, unmeasured tracked releases. Returns how many are still waiting. */
export async function measurePending(db: any): Promise<number> {
  const ready = new Date(Date.now() - 65 * 60_000).toISOString();
  const { data } = await db
    .from("news_releases")
    .select("id,released_at,reactions")
    .neq("event_key", "other")
    // New releases, plus ones whose Gold move is still missing (retried at most every 6 hours).
    .or(`computed_at.is.null,and(reactions->>gold.is.null,computed_at.lt.${new Date(Date.now() - RETRY_MS).toISOString()})`)
    .not("actual", "is", null)
    .lte("released_at", ready)
    .order("released_at", { ascending: false })
    .limit(200);
  const list = (data ?? []) as { id: string; released_at: string; reactions: Reactions | null }[];
  if (!list.length) return 0;
  const batch = list.slice(0, BATCH);
  const h = await hourly();
  await Promise.all(
    batch.map(async (r) => {
      const t = Date.parse(r.released_at);
      const [g, e] = await Promise.all([fiveMin("PAXG", t), fiveMin("EUR", t)]);
      const old = r.reactions;
      // Keep a move measured earlier when a feed is unavailable this time.
      const reactions: Reactions = {
        gold: fiveMinReaction(g, t) ?? old?.gold ?? null,
        eurusd: fiveMinReaction(e, t) ?? old?.eurusd ?? null,
        gbpjpy: hourReaction(h.gbpjpy, t) ?? old?.gbpjpy ?? null,
        dxy: hourReaction(h.dxy, t) ?? old?.dxy ?? null,
      };
      await db.from("news_releases").update({ reactions, computed_at: new Date().toISOString() }).eq("id", r.id);
    }),
  );
  return list.length - batch.length;
}
