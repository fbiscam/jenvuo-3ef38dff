/**
 * Extra indicators (anti-fakeout library). Each uses widely published default
 * settings and closed-candle maths only, so values never repaint.
 */
import { atr, ema, highest, lowest, rma, rsi, sma, stdev, trueRange, wma, type OhlcvBar } from "@/lib/chart/indicators";

type Line = { title: string; color: string; kind: "line" | "histogram"; width?: number; dashed?: boolean; colorFor?: (bar: OhlcvBar, value: number) => string };
export type ExtraSpec = { id: string; name: string; description: string; pane: "main" | "separate"; lines: Line[]; levels?: Array<{ price: number; color: string }>; compute: (bars: OhlcvBar[]) => number[][] };

const N = (v: number | undefined) => (v === undefined ? NaN : v);
const fin = Number.isFinite;
const C = (b: OhlcvBar[]) => b.map((x) => x.close);
const H = (b: OhlcvBar[]) => b.map((x) => x.high);
const L = (b: OhlcvBar[]) => b.map((x) => x.low);
const HL2 = (b: OhlcvBar[]) => b.map((x) => (x.high + x.low) / 2);
const HLC3 = (b: OhlcvBar[]) => b.map((x) => (x.high + x.low + x.close) / 3);
const map2 = (a: number[], b: number[], f: (x: number, y: number) => number) => a.map((x, i) => f(x, N(b[i])));
const diff = (a: number[], n = 1) => a.map((v, i) => (i >= n ? v - N(a[i - n]) : NaN));
const sumN = (a: number[], n: number) => sma(a, n).map((v) => v * n);
const roc = (a: number[], n: number) => a.map((v, i) => { const p = N(a[i - n]); return fin(p) && p !== 0 ? (100 * (v - p)) / p : NaN; });
const histColor = (_b: OhlcvBar, v: number) => (v >= 0 ? "rgba(8,153,129,0.6)" : "rgba(242,54,69,0.6)");
const line = (title: string, color: string, width = 2): Line => ({ title, color, kind: "line", width });
const hist = (title: string): Line => ({ title, color: "#26a69a", kind: "histogram", colorFor: histColor });
const lv = (...p: Array<[number, string]>) => p.map(([price, color]) => ({ price, color }));
const RED = "#f23645", GREEN = "#089981", GREY = "#787b86";

function hma(src: number[], n: number) {
  const half = wma(src, Math.floor(n / 2)); const full = wma(src, n);
  return wma(map2(half, full, (a, b) => 2 * a - b), Math.round(Math.sqrt(n)));
}
function linreg(src: number[], n: number) {
  return src.map((_, i) => {
    if (i < n - 1) return NaN;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let j = 0; j < n; j++) { const y = N(src[i - n + 1 + j]); if (!fin(y)) return NaN; sx += j; sy += y; sxy += j * y; sxx += j * j; }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return (sy - slope * sx) / n + slope * (n - 1);
  });
}
function dmi(b: OhlcvBar[], n = 14) {
  const up = b.map((x, i) => (i ? x.high - N(b[i - 1]?.high) : NaN));
  const dn = b.map((x, i) => (i ? N(b[i - 1]?.low) - x.low : NaN));
  const pdm = up.map((u, i) => (u > N(dn[i]) && u > 0 ? u : fin(u) ? 0 : NaN));
  const mdm = dn.map((d, i) => (d > N(up[i]) && d > 0 ? d : fin(d) ? 0 : NaN));
  const tr = rma(trueRange(b).map((v, i) => (i ? v : NaN)), n);
  const pdi = map2(rma(pdm, n), tr, (a, t) => (100 * a) / t);
  const mdi = map2(rma(mdm, n), tr, (a, t) => (100 * a) / t);
  const dx = map2(pdi, mdi, (p, m) => (p + m === 0 ? 0 : (100 * Math.abs(p - m)) / (p + m)));
  return { pdi, mdi, adx: rma(dx, n) };
}
function supertrend(b: OhlcvBar[], n = 10, mult = 3) {
  const a = atr(b, n); const out: number[] = []; let up = NaN, dn = NaN, dir = 1;
  b.forEach((x, i) => {
    const av = N(a[i]); if (!fin(av)) { out.push(NaN); return; }
    const mid = (x.high + x.low) / 2; const prevC = N(b[i - 1]?.close);
    const bu = mid - mult * av, bd = mid + mult * av;
    up = fin(up) && prevC > up ? Math.max(bu, up) : bu;
    dn = fin(dn) && prevC < dn ? Math.min(bd, dn) : bd;
    if (dir === 1 && x.close < up) dir = -1; else if (dir === -1 && x.close > dn) dir = 1;
    out.push(dir === 1 ? up : dn);
  });
  return out;
}
function psar(b: OhlcvBar[], step = 0.02, max = 0.2) {
  const out = new Array<number>(b.length).fill(NaN); if (b.length < 2) return out;
  let long = b[1]!.close >= b[0]!.close, sar = long ? b[0]!.low : b[0]!.high, ep = long ? b[1]!.high : b[1]!.low, af = step;
  for (let i = 1; i < b.length; i++) {
    const x = b[i]!; sar = sar + af * (ep - sar);
    if (long) { sar = Math.min(sar, b[i - 1]!.low, N(b[i - 2]?.low ?? b[i - 1]!.low)); if (x.low < sar) { long = false; sar = ep; ep = x.low; af = step; } else if (x.high > ep) { ep = x.high; af = Math.min(af + step, max); } }
    else { sar = Math.max(sar, b[i - 1]!.high, N(b[i - 2]?.high ?? b[i - 1]!.high)); if (x.high > sar) { long = true; sar = ep; ep = x.high; af = step; } else if (x.low < ep) { ep = x.low; af = Math.min(af + step, max); } }
    out[i] = sar;
  }
  return out;
}
function kama(src: number[], n = 10, fast = 2, slow = 30) {
  const fs = 2 / (fast + 1), ss = 2 / (slow + 1); let prev = NaN;
  return src.map((v, i) => {
    if (i < n) return NaN;
    let vol = 0; for (let j = i - n + 1; j <= i; j++) vol += Math.abs(N(src[j]) - N(src[j - 1]));
    const er = vol === 0 ? 0 : Math.abs(v - N(src[i - n])) / vol; const sc = (er * (fs - ss) + ss) ** 2;
    prev = fin(prev) ? prev + sc * (v - prev) : v; return prev;
  });
}
function alma(src: number[], n = 9, off = 0.85, sigma = 6) {
  const m = off * (n - 1), s = n / sigma; const w = Array.from({ length: n }, (_, j) => Math.exp(-((j - m) ** 2) / (2 * s * s))); const ws = w.reduce((a, c) => a + c, 0);
  return src.map((_, i) => { if (i < n - 1) return NaN; let acc = 0; for (let j = 0; j < n; j++) acc += N(src[i - n + 1 + j]) * N(w[j]); return acc / ws; });
}
function mcginley(src: number[], n = 14) {
  let md = NaN; return src.map((v) => { md = fin(md) ? md + (v - md) / (n * (v / md) ** 4) : v; return md; });
}
const stochOf = (src: number[], n: number) => { const hi = highest(src, n), lo = lowest(src, n); return src.map((v, i) => { const h = N(hi[i]), l = N(lo[i]); return !fin(h) || !fin(l) ? NaN : h === l ? 50 : (100 * (v - l)) / (h - l); }); };
const vwmaOf = (b: OhlcvBar[], n: number) => map2(sma(b.map((x) => x.close * x.volume), n), sma(b.map((x) => x.volume), n), (a, v) => (v ? a / v : NaN));

export const EXTRA_SPECS: ExtraSpec[] = [
  // ---- Trend / main pane ----
  { id: "ema9", name: "EMA 9", description: "Fast scalping trend, 9 bars", pane: "main", lines: [line("EMA 9", "#00bcd4")], compute: (b) => [ema(C(b), 9)] },
  { id: "ema21", name: "EMA 21", description: "Swing trend filter, 21 bars", pane: "main", lines: [line("EMA 21", "#ff5722")], compute: (b) => [ema(C(b), 21)] },
  { id: "ema100", name: "EMA 100", description: "Medium-term trend, 100 bars", pane: "main", lines: [line("EMA 100", "#795548")], compute: (b) => [ema(C(b), 100)] },
  { id: "hma", name: "Hull MA 9 / 21", description: "Low-lag trend, cuts whipsaw entries", pane: "main", lines: [line("HMA 9", "#00c853"), line("HMA 21", "#d50000")], compute: (b) => [hma(C(b), 9), hma(C(b), 21)] },
  { id: "dema20", name: "DEMA 20", description: "Double EMA, faster than EMA 20", pane: "main", lines: [line("DEMA 20", "#3f51b5")], compute: (b) => { const e = ema(C(b), 20); const ee = ema(e, 20); return [map2(e, ee, (x, y) => 2 * x - y)]; } },
  { id: "tema20", name: "TEMA 20", description: "Triple EMA, very low lag", pane: "main", lines: [line("TEMA 20", "#009688")], compute: (b) => { const e1 = ema(C(b), 20), e2 = ema(e1, 20), e3 = ema(e2, 20); return [e1.map((v, i) => 3 * v - 3 * N(e2[i]) + N(e3[i]))]; } },
  { id: "zlema20", name: "Zero-Lag EMA 20", description: "EMA with lag removed", pane: "main", lines: [line("ZLEMA 20", "#8bc34a")], compute: (b) => { const c = C(b); return [ema(c.map((v, i) => 2 * v - N(c[i - 9])), 20)]; } },
  { id: "vwma20", name: "VWMA 20", description: "Volume-weighted MA; breaks need volume", pane: "main", lines: [line("VWMA 20", "#e91e63")], compute: (b) => [vwmaOf(b, 20)] },
  { id: "kama", name: "KAMA 10/2/30", description: "Adaptive MA, flat in chop", pane: "main", lines: [line("KAMA", "#673ab7")], compute: (b) => [kama(C(b))] },
  { id: "alma", name: "ALMA 9/0.85/6", description: "Arnaud Legoux smooth trend", pane: "main", lines: [line("ALMA", "#ff9800")], compute: (b) => [alma(C(b))] },
  { id: "mcginley", name: "McGinley Dynamic 14", description: "Self-adjusting trend line", pane: "main", lines: [line("McGinley", "#607d8b")], compute: (b) => [mcginley(C(b))] },
  { id: "linreg", name: "Linear Regression 20", description: "Best-fit trend line value", pane: "main", lines: [line("LinReg 20", "#9e9e9e")], compute: (b) => [linreg(C(b), 20)] },
  { id: "supertrend", name: "Supertrend 10 / 3", description: "ATR trend stop; flips only on close", pane: "main", lines: [line("Supertrend", "#00897b")], compute: (b) => [supertrend(b)] },
  { id: "psar", name: "Parabolic SAR 0.02/0.2", description: "Trailing stop dots for trend", pane: "main", lines: [{ title: "PSAR", color: "#ff6d00", kind: "line", width: 1, dashed: true }], compute: (b) => [psar(b)] },
  { id: "keltner", name: "Keltner Channels 20 / 2", description: "EMA 20 with 2× ATR bands", pane: "main", lines: [line("KC mid", GREY, 1), line("KC upper", "#2962ff", 1), line("KC lower", "#2962ff", 1)], compute: (b) => { const m = ema(C(b), 20), a = atr(b, 10); return [m, map2(m, a, (x, y) => x + 2 * y), map2(m, a, (x, y) => x - 2 * y)]; } },
  { id: "envelope", name: "MA Envelope 20 / 0.5%", description: "SMA 20 ± 0.5% stretch bands", pane: "main", lines: [line("Env upper", "#ab47bc", 1), line("Env lower", "#ab47bc", 1)], compute: (b) => { const m = sma(C(b), 20); return [m.map((v) => v * 1.005), m.map((v) => v * 0.995)]; } },
  { id: "ichimoku", name: "Ichimoku 9/26/52", description: "Tenkan, Kijun and cloud spans", pane: "main", lines: [line("Tenkan", "#2962ff", 1), line("Kijun", "#b71c1c", 1), line("Span A", "#43a047", 1), line("Span B", "#e53935", 1)], compute: (b) => { const mid = (n: number) => map2(highest(H(b), n), lowest(L(b), n), (h, l) => (h + l) / 2); const t = mid(9), k = mid(26), sb = mid(52); return [t, k, map2(t, k, (x, y) => (x + y) / 2), sb]; } },
  { id: "chandelier", name: "Chandelier Exit 22 / 3", description: "ATR stops from the 22-bar extreme", pane: "main", lines: [{ title: "Long stop", color: GREEN, kind: "line", width: 1, dashed: true }, { title: "Short stop", color: RED, kind: "line", width: 1, dashed: true }], compute: (b) => { const a = atr(b, 22); return [map2(highest(H(b), 22), a, (h, x) => h - 3 * x), map2(lowest(L(b), 22), a, (l, x) => l + 3 * x)]; } },
  { id: "bbtight", name: "Bollinger 20 / 1", description: "Inner 1-SD bands for trend riding", pane: "main", lines: [line("BB1 upper", "#90a4ae", 1), line("BB1 lower", "#90a4ae", 1)], compute: (b) => { const m = sma(C(b), 20), s = stdev(C(b), 20); return [map2(m, s, (x, y) => x + y), map2(m, s, (x, y) => x - y)]; } },
  // ---- Fakeout filters / oscillators ----
  { id: "adx", name: "ADX / DMI 14", description: "Trend strength; below 20 = fake breaks", pane: "separate", lines: [line("ADX", "#ff9800"), line("+DI", GREEN, 1), line("-DI", RED, 1)], levels: lv([25, GREY], [20, RED]), compute: (b) => { const d = dmi(b); return [d.adx, d.pdi, d.mdi]; } },
  { id: "chop", name: "Choppiness Index 14", description: "Above 61.8 = chop, skip breakouts", pane: "separate", lines: [line("CHOP", "#795548")], levels: lv([61.8, RED], [38.2, GREEN]), compute: (b) => { const s = sumN(trueRange(b), 14), r = map2(highest(H(b), 14), lowest(L(b), 14), (h, l) => h - l); return [map2(s, r, (x, y) => (y > 0 ? (100 * Math.log10(x / y)) / Math.log10(14) : NaN))]; } },
  { id: "squeeze", name: "Squeeze Momentum 20", description: "BB inside Keltner = coiled; fire on release", pane: "separate", lines: [hist("Momentum")], levels: lv([0, GREY]), compute: (b) => { const c = C(b); const mid = map2(map2(highest(H(b), 20), lowest(L(b), 20), (h, l) => (h + l) / 2), sma(c, 20), (x, y) => (x + y) / 2); return [linreg(map2(c, mid, (x, y) => x - y), 20)]; } },
  { id: "cci", name: "CCI 20", description: "±100 extremes of typical price", pane: "separate", lines: [line("CCI 20", "#2962ff")], levels: lv([100, RED], [-100, GREEN]), compute: (b) => { const tp = HLC3(b), m = sma(tp, 20); return [tp.map((v, i) => { const mm = N(m[i]); if (!fin(mm)) return NaN; let md = 0; for (let j = 0; j < 20; j++) md += Math.abs(N(tp[i - j]) - mm); md /= 20; return md ? (v - mm) / (0.015 * md) : 0; })]; } },
  { id: "willr", name: "Williams %R 14", description: "-20 / -80 overbought / oversold", pane: "separate", lines: [line("%R", "#7e57c2")], levels: lv([-20, RED], [-80, GREEN]), compute: (b) => { const hi = highest(H(b), 14), lo = lowest(L(b), 14); return [b.map((x, i) => { const h = N(hi[i]), l = N(lo[i]); return h === l ? -50 : (-100 * (h - x.close)) / (h - l); })]; } },
  { id: "stochrsi", name: "Stoch RSI 14/14/3/3", description: "RSI timing within its own range", pane: "separate", lines: [line("K", "#2962ff"), line("D", "#ff9800", 1)], levels: lv([80, RED], [20, GREEN]), compute: (b) => { const k = sma(stochOf(rsi(C(b), 14), 14), 3); return [k, sma(k, 3)]; } },
  { id: "mfi", name: "Money Flow Index 14", description: "Volume-weighted RSI", pane: "separate", lines: [line("MFI", "#00897b")], levels: lv([80, RED], [20, GREEN]), compute: (b) => { const tp = HLC3(b); const pos = tp.map((v, i) => (i && v > N(tp[i - 1]) ? v * N(b[i]?.volume) : 0)); const neg = tp.map((v, i) => (i && v < N(tp[i - 1]) ? v * N(b[i]?.volume) : 0)); return [map2(sumN(pos, 14), sumN(neg, 14), (p, n) => (p + n === 0 ? 50 : (100 * p) / (p + n)))]; } },
  { id: "obv", name: "On-Balance Volume", description: "Cumulative volume flow", pane: "separate", lines: [line("OBV", "#3f51b5")], compute: (b) => { let o = 0; return [b.map((x, i) => { const p = N(b[i - 1]?.close); if (fin(p)) o += x.close > p ? x.volume : x.close < p ? -x.volume : 0; return o; })]; } },
  { id: "cmf", name: "Chaikin Money Flow 20", description: "Buying vs selling pressure", pane: "separate", lines: [hist("CMF")], levels: lv([0, GREY]), compute: (b) => { const mfv = b.map((x) => (x.high === x.low ? 0 : (((x.close - x.low) - (x.high - x.close)) / (x.high - x.low)) * x.volume)); return [map2(sumN(mfv, 20), sumN(b.map((x) => x.volume), 20), (a, v) => (v ? a / v : 0))]; } },
  { id: "cmo", name: "Chande Momentum 9", description: "±50 momentum extremes", pane: "separate", lines: [line("CMO 9", "#ef6c00")], levels: lv([50, RED], [0, GREY], [-50, GREEN]), compute: (b) => { const d = diff(C(b)); const u = sumN(d.map((v) => (v > 0 ? v : fin(v) ? 0 : NaN)), 9), w = sumN(d.map((v) => (v < 0 ? -v : fin(v) ? 0 : NaN)), 9); return [map2(u, w, (x, y) => (x + y ? (100 * (x - y)) / (x + y) : 0))]; } },
  { id: "tsi", name: "True Strength Index 25/13", description: "Double-smoothed momentum + signal", pane: "separate", lines: [line("TSI", "#2962ff"), line("Signal", "#ff9800", 1)], levels: lv([0, GREY]), compute: (b) => { const d = diff(C(b)); const t = map2(ema(ema(d, 25), 13), ema(ema(d.map(Math.abs), 25), 13), (x, y) => (y ? (100 * x) / y : 0)); return [t, ema(t, 13)]; } },
  { id: "ao", name: "Awesome Oscillator 5/34", description: "Median-price momentum bars", pane: "separate", lines: [hist("AO")], levels: lv([0, GREY]), compute: (b) => [map2(sma(HL2(b), 5), sma(HL2(b), 34), (x, y) => x - y)] },
  { id: "momentum", name: "Momentum 10", description: "Close minus close 10 bars ago", pane: "separate", lines: [line("MOM 10", "#00acc1")], levels: lv([0, GREY]), compute: (b) => [diff(C(b), 10)] },
  { id: "trix", name: "TRIX 18", description: "Triple-smoothed rate of change", pane: "separate", lines: [line("TRIX", "#c2185b")], levels: lv([0, GREY]), compute: (b) => [roc(ema(ema(ema(C(b), 18), 18), 18), 1).map((v) => v * 100)] },
  { id: "uo", name: "Ultimate Oscillator 7/14/28", description: "Three-speed buying pressure", pane: "separate", lines: [line("UO", "#5e35b1")], levels: lv([70, RED], [30, GREEN]), compute: (b) => { const bp = b.map((x, i) => x.close - Math.min(x.low, N(b[i - 1]?.close ?? x.low))); const tr = trueRange(b); const a = (n: number) => map2(sumN(bp, n), sumN(tr, n), (x, y) => (y ? x / y : NaN)); const a7 = a(7), a14 = a(14), a28 = a(28); return [a7.map((v, i) => (100 * (4 * v + 2 * N(a14[i]) + N(a28[i]))) / 7)]; } },
  { id: "aroon", name: "Aroon 14", description: "Bars since high / low; trend age", pane: "separate", lines: [line("Aroon up", GREEN), line("Aroon down", RED)], levels: lv([70, GREY], [30, GREY]), compute: (b) => { const f = (src: number[], hi: boolean) => src.map((_, i) => { if (i < 14) return NaN; let best = i; for (let j = i - 14; j <= i; j++) if (hi ? N(src[j]) >= N(src[best]) : N(src[j]) <= N(src[best])) best = j; return (100 * (14 - (i - best))) / 14; }); return [f(H(b), true), f(L(b), false)]; } },
  { id: "vortex", name: "Vortex 14", description: "VI+ / VI- trend crossovers", pane: "separate", lines: [line("VI+", GREEN), line("VI-", RED)], levels: lv([1, GREY]), compute: (b) => { const vp = b.map((x, i) => (i ? Math.abs(x.high - N(b[i - 1]?.low)) : NaN)), vm = b.map((x, i) => (i ? Math.abs(x.low - N(b[i - 1]?.high)) : NaN)); const tr = sumN(trueRange(b).map((v, i) => (i ? v : NaN)), 14); return [map2(sumN(vp, 14), tr, (x, y) => x / y), map2(sumN(vm, 14), tr, (x, y) => x / y)]; } },
  { id: "bbw", name: "Bollinger Band Width 20", description: "Low width = squeeze before move", pane: "separate", lines: [line("BBW %", "#455a64")], compute: (b) => { const m = sma(C(b), 20), s = stdev(C(b), 20); return [map2(m, s, (x, y) => (x ? (400 * y) / x : NaN))]; } },
  { id: "bbp", name: "Bollinger %B 20", description: "Where close sits inside the bands", pane: "separate", lines: [line("%B", "#1e88e5")], levels: lv([1, RED], [0.5, GREY], [0, GREEN]), compute: (b) => { const m = sma(C(b), 20), s = stdev(C(b), 20); return [b.map((x, i) => { const sd = N(s[i]); return sd ? (x.close - (N(m[i]) - 2 * sd)) / (4 * sd) : NaN; })]; } },
  { id: "atrp", name: "ATR % 14", description: "Volatility as % of price", pane: "separate", lines: [line("ATR %", RED)], compute: (b) => [map2(atr(b, 14), C(b), (a, c) => (c ? (100 * a) / c : NaN))] },
  { id: "elder", name: "Elder Ray 13", description: "Bull and bear power vs EMA 13", pane: "separate", lines: [line("Bull power", GREEN), line("Bear power", RED)], levels: lv([0, GREY]), compute: (b) => { const e = ema(C(b), 13); return [map2(H(b), e, (h, x) => h - x), map2(L(b), e, (l, x) => l - x)]; } },
  { id: "force", name: "Force Index 13", description: "Price change × volume, smoothed", pane: "separate", lines: [hist("Force 13")], levels: lv([0, GREY]), compute: (b) => [ema(b.map((x, i) => (i ? (x.close - N(b[i - 1]?.close)) * x.volume : NaN)), 13)] },
  { id: "dpo", name: "Detrended Price Osc 21", description: "Cycles with trend removed", pane: "separate", lines: [line("DPO", "#6d4c41")], levels: lv([0, GREY]), compute: (b) => { const m = sma(C(b), 21); return [b.map((x, i) => x.close - N(m[i - 11]))]; } },
  { id: "coppock", name: "Coppock Curve 10/14/11", description: "Long-term momentum turns", pane: "separate", lines: [line("Coppock", "#0097a7")], levels: lv([0, GREY]), compute: (b) => [wma(map2(roc(C(b), 14), roc(C(b), 11), (x, y) => x + y), 10)] },
  { id: "fisher", name: "Fisher Transform 9", description: "Sharp turning-point signals", pane: "separate", lines: [line("Fisher", "#2962ff"), line("Trigger", "#ff9800", 1)], levels: lv([0, GREY]), compute: (b) => { const st = stochOf(HL2(b), 9); let v = 0, f = 0; const out = st.map((s) => { if (!fin(s)) return NaN; v = 0.66 * (s / 100 - 0.5) + 0.67 * v; v = Math.max(-0.999, Math.min(0.999, v)); f = 0.5 * Math.log((1 + v) / (1 - v)) + 0.5 * f; return f; }); return [out, out.map((x, i) => N(out[i - 1]))]; } },
  { id: "rvi", name: "Relative Vigor Index 10", description: "Close vs open vigor + signal", pane: "separate", lines: [line("RVI", GREEN), line("Signal", RED, 1)], levels: lv([0, GREY]), compute: (b) => { const r = map2(sma(b.map((x) => x.close - x.open), 10), sma(b.map((x) => x.high - x.low), 10), (x, y) => (y ? x / y : 0)); return [r, sma(r, 4)]; } },
  { id: "rsi7", name: "RSI 7 (fast)", description: "Fast RSI for scalps, 80 / 20", pane: "separate", lines: [line("RSI 7", "#ab47bc")], levels: lv([80, RED], [50, GREY], [20, GREEN]), compute: (b) => [rsi(C(b), 7)] },
];
