/**
 * JX Bot H1 swing-to-swing rules (mirrors resources/mt5/JXBot H1.mq5).
 * - Swing high at bar j: high[j] is the highest of the SWING_LEFT bars before it and of bar j+1,
 *   and Candle 1 (bar j+1) closes bearish below the swing candle's close. Swing low mirrors it. Known only at Candle 1 close.
 * - Swing high -> SELL at Candle 1 close, SL = swing high wick. Swing low -> BUY, SL = swing low wick.
 * - Exit: SL hit, or the next opposite swing confirms (close at that Candle 1 close). Same-side swings do nothing.
 * - Max 2 open trades, one per symbol, signals that find no free slot are dropped (no queue).
 * - News: no entries from 60 min before to 60 min after a high-impact event; at 60 min before,
 *   winners close and losers close once +BREAKEVEN_PIPS. Same for XAU/EUR on Friday >= 20:00 UTC.
 * - Daily circuit breaker: day loss (closed + floating) <= -4.5% of day start balance closes all, day locked.
 */
export const SWING_LEFT = 7; // same left length as the chart labels (FRACTAL_RADIUS)
export const MAX_OPEN = 2;
export const BREAKER_PCT = 4.5;
export const BREAKEVEN_PIPS = 2;
export const NEWS_WINDOW_MIN = 60;
export const FRIDAY_CUTOFF_UTC = 20;

export type Bar = { time: number; open: number; high: number; low: number; close: number }; // time = open, seconds
export type SymbolSpec = { symbol: string; pip: number; usdPerUnit: number; weekendGuard: boolean };
export type Signal = { symbol: string; dir: 1 | -1; at: number; price: number; sl: number; swingTime: number };
export type Trade = Signal & { exitAt: number; exitPrice: number; reason: "swing" | "sl" | "news" | "friday" | "breaker" | "open"; pips: number; pnl: number };

const HOUR = 3600;

/** Swings confirmed at each Candle 1 close. Uses closed bars only. */
export function confirmedSwings(bars: Bar[], symbol: string): Signal[] {
  const out: Signal[] = [];
  for (let j = SWING_LEFT; j + 1 < bars.length; j++) {
    const b = bars[j]!, c1 = bars[j + 1]!;
    const left = bars.slice(j - SWING_LEFT, j);
    const at = c1.time + HOUR;
    if (left.every((x) => x.high < b.high) && c1.high <= b.high && c1.close < b.close && c1.close < c1.open)
      out.push({ symbol, dir: -1, at, price: c1.close, sl: b.high, swingTime: b.time });
    if (left.every((x) => x.low > b.low) && c1.low >= b.low && c1.close > b.close && c1.close > c1.open)
      out.push({ symbol, dir: 1, at, price: c1.close, sl: b.low, swingTime: b.time });
  }
  return out;
}

/** Gold / FX market closed Fri 21:00 -> Sun 22:00 UTC (the 24/7 feed keeps printing). */
export function isFxWeekend(t: number) {
  const d = new Date(t * 1000), day = d.getUTCDay(), h = d.getUTCHours();
  return (day === 5 && h >= 21) || day === 6 || (day === 0 && h < 22);
}
export function isFridayCutoff(t: number) {
  const d = new Date(t * 1000);
  return (d.getUTCDay() === 5 && d.getUTCHours() >= FRIDAY_CUTOFF_UTC) || d.getUTCDay() === 6;
}
export function inNewsWindow(t: number, news: number[]) {
  return news.some((n) => t >= n - NEWS_WINDOW_MIN * 60 && t <= n + NEWS_WINDOW_MIN * 60);
}

type Open = Signal & { lots: number };

/** Portfolio simulation over hourly bars of several symbols. news = high-impact event times (seconds). */
export function simulate(data: { spec: SymbolSpec; bars: Bar[] }[], news: number[], startBalance: number) {
  const specs = new Map(data.map((d) => [d.spec.symbol, d.spec]));
  const barMap = new Map(data.map((d) => [d.spec.symbol, new Map(d.bars.map((b) => [b.time, b]))]));
  const signals = data.flatMap((d) => confirmedSwings(d.bars, d.spec.symbol));
  const times = [...new Set(data.flatMap((d) => d.bars.map((b) => b.time)))].sort((a, b) => a - b);
  const open: Open[] = [];
  const trades: Trade[] = [];
  const dropped: Signal[] = [];
  let balance = startBalance, day = "", dayStart = balance, dayLocked = false, maxDayDd = 0;
  const pnlOf = (o: Open, px: number) => (px - o.price) * o.dir * specs.get(o.symbol)!.usdPerUnit;
  const close = (o: Open, at: number, px: number, reason: Trade["reason"]) => {
    const pnl = pnlOf(o, px);
    balance += pnl;
    trades.push({ ...o, exitAt: at, exitPrice: px, reason, pips: ((px - o.price) * o.dir) / specs.get(o.symbol)!.pip, pnl });
    open.splice(open.indexOf(o), 1);
  };
  const guardOpen = new Set<Open>(); // waiting for +BREAKEVEN_PIPS
  for (const t of times) {
    const end = t + HOUR;
    const dk = new Date(t * 1000).toISOString().slice(0, 10);
    if (dk !== day) { day = dk; dayStart = balance; dayLocked = false; }
    // 1) intrabar: SL, breakeven guard, floating breaker (worst case of the bar)
    for (const o of [...open]) {
      const b = barMap.get(o.symbol)!.get(t); if (!b) continue;
      const spec = specs.get(o.symbol)!;
      if (o.dir === 1 ? b.low <= o.sl : b.high >= o.sl) { close(o, end, o.sl, "sl"); guardOpen.delete(o); continue; }
      if (guardOpen.has(o)) {
        const be = o.price + o.dir * BREAKEVEN_PIPS * spec.pip;
        if (o.dir === 1 ? b.high >= be : b.low <= be) { close(o, end, be, isFridayCutoff(t) ? "friday" : "news"); guardOpen.delete(o); }
      }
    }
    const worst = open.reduce((s, o) => { const b = barMap.get(o.symbol)!.get(t); return b ? s + pnlOf(o, o.dir === 1 ? b.low : b.high) : s; }, 0);
    const dayDd = balance + worst - dayStart;
    maxDayDd = Math.min(maxDayDd, dayDd);
    if (!dayLocked && dayDd <= -dayStart * BREAKER_PCT / 100) {
      for (const o of [...open]) { const b = barMap.get(o.symbol)!.get(t)!; close(o, end, o.dir === 1 ? b.low : b.high, "breaker"); guardOpen.delete(o); }
      dayLocked = true;
    }
    // 2) at bar close: news / Friday guard on open trades
    for (const o of [...open]) {
      const spec = specs.get(o.symbol)!;
      const blocked = news.some((n) => end >= n - NEWS_WINDOW_MIN * 60 && end <= n) || (spec.weekendGuard && isFridayCutoff(end));
      if (!blocked) continue;
      const b = barMap.get(o.symbol)!.get(t); if (!b) continue;
      if (pnlOf(o, b.close) > 0) { close(o, end, b.close, isFridayCutoff(end) ? "friday" : "news"); guardOpen.delete(o); }
      else guardOpen.add(o);
    }
    // 3) signals confirmed at this bar close: exits first, then entries
    const now = signals.filter((s) => s.at === end);
    for (const s of now) {
      const o = open.find((x) => x.symbol === s.symbol && x.dir !== s.dir);
      if (o) { close(o, end, s.price, "swing"); guardOpen.delete(o); }
    }
    for (const s of now) {
      const spec = specs.get(s.symbol)!;
      const block = dayLocked || inNewsWindow(end, news) || (spec.weekendGuard && isFridayCutoff(end));
      if (block || open.length >= MAX_OPEN || open.some((x) => x.symbol === s.symbol)) { dropped.push(s); continue; }
      if (Math.abs(s.price - s.sl) <= 0) { dropped.push(s); continue; }
      open.push({ ...s, lots: 1 });
    }
  }
  for (const o of [...open]) {
    const bars = data.find((d) => d.spec.symbol === o.symbol)!.bars; const last = bars.at(-1)!;
    const pnl = pnlOf(o, last.close);
    trades.push({ ...o, exitAt: last.time + HOUR, exitPrice: last.close, reason: "open", pips: ((last.close - o.price) * o.dir) / specs.get(o.symbol)!.pip, pnl });
  }
  return { trades: trades.sort((a, b) => a.at - b.at), dropped, closedBalance: balance, maxDayDrawdown: maxDayDd };
}
