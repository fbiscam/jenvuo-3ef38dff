/** Jenvu EA closed-candle rules. Entry evidence is evaluated when available,
 * never backdated to the pivot or Candle 1. Hourly simulation is not an MT5 backtest. */
import { computeSmcOverlay, computeLivePivots } from "./smc-overlay";
import { classifySwingPriceAction } from "./swing-price-action";
import { classifySwingSweep } from "./swing-sweep";
import { isHighProbabilityPriceAction, isHighProbabilitySweep } from "./high-probability";
export const SWING_LEFT = 7; // same left length as the chart labels (FRACTAL_RADIUS)
export const MAX_OPEN = Infinity; // one per symbol; no portfolio cap
export const BREAKER_PCT = 4.5;
export const BREAKEVEN_PIPS = 2;
export const NEWS_WINDOW_MIN = 60;
export const FRIDAY_CUTOFF_UTC = 20;

export type Bar = { time: number; open: number; high: number; low: number; close: number }; // time = open, seconds
export type SymbolSpec = { symbol: string; pip: number; usdPerUnit: number; weekendGuard: boolean };
export type Signal = { symbol: string; dir: 1 | -1; at: number; price: number; sl: number; swingTime: number };
export type Trade = Signal & { exitAt: number; exitPrice: number; reason: "swing" | "sl" | "news" | "friday" | "breaker" | "open"; pips: number; pnl: number };

const HOUR = 3600;

const candles = (bars: Bar[]) => bars.map(b => ({ t: b.time, o: b.open, h: b.high, l: b.low, c: b.close }));

/** First appearance of each Candle-1 swing, without future candles. Used for exits. */
export function confirmedSwings(bars: Bar[], symbol: string): Signal[] {
  const seen = new Set<string>(), out: Signal[] = [];
  for (let n = SWING_LEFT + 2; n <= bars.length; n++) {
    const closed = bars.slice(0, n), last = closed.at(-1);
    if (!last) continue;
    for (const p of computeLivePivots(candles(closed), null, [])) {
      const key = `${p.kind}:${p.t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ symbol, dir: p.kind === "high" ? -1 : 1, at: last.time + HOUR, price: last.close, sl: p.price, swingTime: p.t });
    }
  }
  return out;
}

export function entryAllowed(priceAction: boolean, sweep: boolean) { return priceAction || sweep; }

/** Same strict gates as drawn Terminal tags. PA needs 3 closed reaction candles;
 * strong sweep needs its full 5-candle hold. No look-ahead or old-signal queue. */
export function confirmedEntries(bars: Bar[], symbol: string): Signal[] {
  const out: Signal[] = [], seen = new Set<string>();
  for (let n = 10; n <= bars.length; n++) {
    const closed = bars.slice(Math.max(0, n - 400), n), last = closed.at(-1);
    if (!last) continue;
    const cs = candles(closed);
    const overlay = computeSmcOverlay(closed.map(b => ({ ...b, volume: 0 })), last.close, null, { useVolume: false });
    for (const p of computeLivePivots(cs, null, [])) {
      const key = `${p.kind}:${p.t}`;
      if (seen.has(key)) continue;
      const i = cs.findIndex(b => b.t === p.t);
      const pa = classifySwingPriceAction(cs, i, p.kind, overlay.pressure?.[p.t * 1000]);
      const sw = classifySwingSweep(cs, i, p.kind);
      if (!entryAllowed(isHighProbabilityPriceAction(pa), isHighProbabilitySweep(sw))) continue;
      seen.add(key);
      out.push({ symbol, dir: p.kind === "high" ? -1 : 1, at: last.time + HOUR, price: last.close, sl: p.price, swingTime: p.t });
    }
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
  const entries = data.flatMap((d) => confirmedEntries(d.bars, d.spec.symbol));
  const times = [...new Set(data.flatMap((d) => d.bars.map((b) => b.time)))].sort((a, b) => a - b);
  const open: Open[] = [];
  const trades: Trade[] = [];
  const dropped: Signal[] = [];
  let balance = startBalance, day = "", dayStart = balance, dayLocked = false, maxDayDd = 0;
  const pnlOf = (o: Open, px: number) => (px - o.price) * o.dir * (specs.get(o.symbol)?.usdPerUnit ?? 0);
  const close = (o: Open, at: number, px: number, reason: Trade["reason"]) => {
    const pnl = pnlOf(o, px);
    balance += pnl;
    trades.push({ ...o, exitAt: at, exitPrice: px, reason, pips: ((px - o.price) * o.dir) / (specs.get(o.symbol)?.pip ?? 1), pnl });
    open.splice(open.indexOf(o), 1);
  };
  const guardOpen = new Set<Open>(); // waiting for +BREAKEVEN_PIPS
  for (const t of times) {
    const end = t + HOUR;
    const dk = new Date(t * 1000).toISOString().slice(0, 10);
    if (dk !== day) { day = dk; dayStart = balance; dayLocked = false; }
    // 1) intrabar: SL, breakeven guard, floating breaker (worst case of the bar)
    for (const o of [...open]) {
      const b = barMap.get(o.symbol)?.get(t); if (!b) continue;
      const spec = specs.get(o.symbol); if (!spec) continue;
      if (o.dir === 1 ? b.low <= o.sl : b.high >= o.sl) { close(o, end, o.sl, "sl"); guardOpen.delete(o); continue; }
      if (guardOpen.has(o)) {
        const be = o.price + o.dir * BREAKEVEN_PIPS * spec.pip;
        if (o.dir === 1 ? b.high >= be : b.low <= be) { close(o, end, be, isFridayCutoff(t) ? "friday" : "news"); guardOpen.delete(o); }
      }
    }
    const worst = open.reduce((s, o) => { const b = barMap.get(o.symbol)?.get(t); return b ? s + pnlOf(o, o.dir === 1 ? b.low : b.high) : s; }, 0);
    const dayDd = balance + worst - dayStart;
    maxDayDd = Math.min(maxDayDd, dayDd);
    if (!dayLocked && dayDd <= -dayStart * BREAKER_PCT / 100) {
      for (const o of [...open]) { const b = barMap.get(o.symbol)?.get(t); if (!b) continue; close(o, end, o.dir === 1 ? b.low : b.high, "breaker"); guardOpen.delete(o); }
      dayLocked = true;
    }
    // 2) at bar close: news / Friday guard on open trades
    for (const o of [...open]) {
      const spec = specs.get(o.symbol); if (!spec) continue;
      const blocked = news.some((n) => end >= n - NEWS_WINDOW_MIN * 60 && end <= n) || (spec.weekendGuard && isFridayCutoff(end));
      if (!blocked) continue;
      const b = barMap.get(o.symbol)?.get(t); if (!b) continue;
      if (pnlOf(o, b.close) > 0) { close(o, end, b.close, isFridayCutoff(end) ? "friday" : "news"); guardOpen.delete(o); }
      else guardOpen.add(o);
    }
    // 3) signals confirmed at this bar close: exits first, then entries
    const now = signals.filter((s) => s.at === end);
    for (const s of now) {
      const o = open.find((x) => x.symbol === s.symbol && x.dir !== s.dir);
      if (o) { close(o, end, s.price, "swing"); guardOpen.delete(o); }
    }
    for (const s of entries.filter(s => s.at === end)) {
      const spec = specs.get(s.symbol); if (!spec) continue;
      const block = dayLocked || inNewsWindow(end, news) || (spec.weekendGuard && (isFridayCutoff(end) || isFxWeekend(end)));
      if (block || open.length >= MAX_OPEN || open.some((x) => x.symbol === s.symbol)) { dropped.push(s); continue; }
      if (Math.abs(s.price - s.sl) <= 0) { dropped.push(s); continue; }
      open.push({ ...s, lots: 1 });
    }
  }
  for (const o of [...open]) {
    const bars = data.find((d) => d.spec.symbol === o.symbol)?.bars; const last = bars?.at(-1); if (!last) continue;
    const pnl = pnlOf(o, last.close);
    trades.push({ ...o, exitAt: last.time + HOUR, exitPrice: last.close, reason: "open", pips: ((last.close - o.price) * o.dir) / (specs.get(o.symbol)?.pip ?? 1), pnl });
  }
  return { trades: trades.sort((a, b) => a.at - b.at), dropped, closedBalance: balance, maxDayDrawdown: maxDayDd };
}
