import {
  atr,
  bollinger,
  ema,
  macd,
  rsi,
  sma,
  wma,
  highest,
  lowest,
  vwap,
  type OhlcvBar,
} from "@/lib/chart/indicators";
import { EXTRA_SPECS } from "./indicator-specs-extra";
import { RVOL_PERIOD, rvolLevel, volumeBaseline, volumeSplit } from "@/lib/chart/relative-volume";

type BaseIndicatorId =
  | "volume"
  | "rvol"
  | "ema20"
  | "ema50"
  | "ema200"
  | "sma20"
  | "sma50"
  | "sma200"
  | "wma20"
  | "donchian"
  | "stochastic"
  | "roc"
  | "bb"
  | "vwap"
  | "rsi"
  | "macd"
  | "atr"
  | "sr";
/** Base ids plus the extra anti-fakeout library ids. */
export type IndicatorId = BaseIndicatorId | (string & { readonly __extra?: never });

export type IndicatorLine = {
  title: string;
  color: string;
  kind: "line" | "histogram";
  width?: number;
  dashed?: boolean;
  /** `index` and `all` (every computed line) let a bar compare itself to a baseline. */
  colorFor?: (bar: OhlcvBar, value: number, index?: number, all?: number[][]) => string;
};

export type IndicatorSpec = {
  id: IndicatorId;
  name: string;
  description: string;
  pane: "main" | "volume" | "separate";
  lines: IndicatorLine[];
  levels?: Array<{ price: number; color: string }>;
  compute: (bars: OhlcvBar[]) => number[][];
};

const closes = (bars: OhlcvBar[]) => bars.map((b) => b.close);

const BASE_SPECS: Record<BaseIndicatorId, IndicatorSpec> = {
  volume: {
    id: "volume",
    name: "Volume",
    description: "Tick volume of each candle",
    pane: "volume",
    lines: [
      {
        title: "Volume",
        color: "rgba(120,123,134,0.35)",
        kind: "histogram",
        colorFor: (bar) => (bar.close >= bar.open ? "rgba(8,153,129,0.35)" : "rgba(242,54,69,0.35)"),
      },
    ],
    compute: (bars) => [bars.map((b) => b.volume)],
  },
  rvol: {
    id: "rvol",
    name: "Volume (RVOL + Spike)",
    description: "Buy / sell volume bars with spike colours ",
    pane: "volume",
    lines: [
      {
        title: "Volume",
        color: "rgba(120,123,134,0.45)",
        kind: "histogram",
        colorFor: (bar, v, j, all) => {
          const base = all?.[1]?.[j ?? -1];
          const ratio = Number.isFinite(base) && (base as number) > 0 ? v / (base as number) : NaN;
          const level = rvolLevel(ratio);
          // Bar colour = which side the volume came from (buy green / sell red).
          const side = volumeSplit(bar).side;
          if (level === "ultra") return side === "buy" ? "rgba(0,200,140,1)" : side === "sell" ? "rgba(255,40,60,1)" : "rgba(255,170,0,1)";
          if (level === "high") return side === "buy" ? "rgba(0,200,140,0.75)" : side === "sell" ? "rgba(255,40,60,0.75)" : "rgba(255,170,0,0.9)";
          return side === "buy" ? "rgba(8,153,129,0.35)" : side === "sell" ? "rgba(242,54,69,0.35)" : "rgba(120,123,134,0.35)";
        },
      },
      { title: "MA 20", color: "#ff9800", kind: "line", width: 1 },
    ],
    compute: (bars) => {
      const v = bars.map((b) => b.volume);
      return [v, volumeBaseline(v, RVOL_PERIOD)];
    },
  },
  ema20: {
    id: "ema20",
    name: "EMA 20",
    description: "Exponential moving average, 20 bars",
    pane: "main",
    lines: [{ title: "EMA 20", color: "#ff9800", kind: "line", width: 2 }],
    compute: (bars) => [ema(closes(bars), 20)],
  },
  ema50: {
    id: "ema50",
    name: "EMA 50",
    description: "Exponential moving average, 50 bars",
    pane: "main",
    lines: [{ title: "EMA 50", color: "#2962ff", kind: "line", width: 2 }],
    compute: (bars) => [ema(closes(bars), 50)],
  },
  ema200: {
    id: "ema200",
    name: "EMA 200",
    description: "Exponential moving average, 200 bars",
    pane: "main",
    lines: [{ title: "EMA 200", color: "#9c27b0", kind: "line", width: 2 }],
    compute: (bars) => [ema(closes(bars), 200)],
  },
  sma20: {
    id: "sma20",
    name: "SMA 20",
    description: "Simple moving average, 20 bars",
    pane: "main",
    lines: [{ title: "SMA 20", color: "#00897b", kind: "line", width: 1 }],
    compute: (bars) => [sma(closes(bars), 20)],
  },
  bb: {
    id: "bb",
    name: "Bollinger Bands",
    description: "20-bar basis with 2 standard-deviation\u00a0",
    pane: "main",
    lines: [
      { title: "BB basis", color: "#787b86", kind: "line", width: 1 },
      { title: "BB upper", color: "#2962ff", kind: "line", width: 1 },
      { title: "BB lower", color: "#2962ff", kind: "line", width: 1 },
    ],
    compute: (bars) => {
      const b = bollinger(closes(bars), 20, 2);
      return [b.basis, b.upper, b.lower];
    },
  },
  sma50: {
    id: "sma50", name: "SMA 50", description: "Simple moving average · 50 bars", pane: "main",
    lines: [{ title: "SMA 50", color: "#00897b", kind: "line", width: 2 }],
    compute: (bars) => [sma(closes(bars), 50)],
  },
  sma200: {
    id: "sma200", name: "SMA 200", description: "Simple moving average · 200 bars", pane: "main",
    lines: [{ title: "SMA 200", color: "#9c27b0", kind: "line", width: 2 }],
    compute: (bars) => [sma(closes(bars), 200)],
  },
  wma20: {
    id: "wma20", name: "WMA 20", description: "Weighted moving average · 20 bars", pane: "main",
    lines: [{ title: "WMA 20", color: "#ff9800", kind: "line", width: 2 }],
    compute: (bars) => [wma(closes(bars), 20)],
  },
  donchian: {
    id: "donchian", name: "Donchian Channels", description: "20-bar high / low channel", pane: "main",
    lines: [
      { title: "DC upper", color: "#00897b", kind: "line" },
      { title: "DC middle", color: "#787b86", kind: "line" },
      { title: "DC lower", color: "#f23645", kind: "line" },
    ],
    compute: (bars) => {
      const upper = highest(bars.map((b) => b.high), 20);
      const lower = lowest(bars.map((b) => b.low), 20);
      return [upper, upper.map((v, i) => (v + (lower[i] ?? NaN)) / 2), lower];
    },
  },
  stochastic: {
    id: "stochastic", name: "Stochastic 14/3/3", description: "Smoothed %K / %D · 80 / 20 levels", pane: "separate",
    lines: [{ title: "%K", color: "#2962ff", kind: "line", width: 2 }, { title: "%D", color: "#ff9800", kind: "line" }],
    levels: [{ price: 80, color: "#f23645" }, { price: 20, color: "#089981" }],
    compute: (bars) => {
      const hi = highest(bars.map((b) => b.high), 14);
      const lo = lowest(bars.map((b) => b.low), 14);
      const raw = bars.map((b, i) => {
        const h = hi[i]; const l = lo[i];
        if (h === undefined || l === undefined || !Number.isFinite(h) || !Number.isFinite(l)) return NaN;
        return h === l ? 50 : 100 * (b.close - l) / (h - l);
      });
      const k = sma(raw, 3);
      return [k, sma(k, 3)];
    },
  },
  roc: {
    id: "roc", name: "Rate of Change 9", description: "9-bar percentage momentum", pane: "separate",
    lines: [{ title: "ROC 9", color: "#00897b", kind: "line", width: 2 }],
    levels: [{ price: 0, color: "#787b86" }],
    compute: (bars) => [bars.map((b, i) => {
      const prior = bars[i - 9]?.close;
      return prior === undefined || prior === 0 ? NaN : 100 * (b.close - prior) / prior;
    })],
  },
  vwap: {
    id: "vwap",
    name: "VWAP",
    description: "Volume-weighted average price",
    pane: "main",
    lines: [{ title: "VWAP", color: "#e040fb", kind: "line", width: 2 }],
    compute: (bars) => [vwap(bars)],
  },
  rsi: {
    id: "rsi",
    name: "RSI 14",
    description: "Relative strength index in its own panel",
    pane: "separate",
    lines: [{ title: "RSI 14", color: "#7e57c2", kind: "line", width: 2 }],
    levels: [
      { price: 70, color: "#f23645" },
      { price: 50, color: "#b2b5be" },
      { price: 30, color: "#089981" },
    ],
    compute: (bars) => [rsi(closes(bars), 14)],
  },
  macd: {
    id: "macd",
    name: "MACD 12/26/9",
    description: "MACD line, signal and histogram on panel",
    pane: "separate",
    lines: [
      {
        title: "Histogram",
        color: "#26a69a",
        kind: "histogram",
        colorFor: (_bar, v) => (v >= 0 ? "rgba(8,153,129,0.55)" : "rgba(242,54,69,0.55)"),
      },
      { title: "MACD", color: "#2962ff", kind: "line", width: 2 },
      { title: "Signal", color: "#ff9800", kind: "line", width: 1 },
    ],
    compute: (bars) => {
      const m = macd(closes(bars));
      return [m.hist, m.macd, m.signal];
    },
  },
  sr: {
    id: "sr",
    name: "Support & Resistance",
    description: "10-bar swing resistance and support",
    pane: "main",
    lines: [
      { title: "Resistance", color: "#f23645", kind: "line", width: 2, dashed: true },
      { title: "Support", color: "#089981", kind: "line", width: 2, dashed: true },
    ],
    compute: (bars) => {
      const r = 10;
      const res = new Array<number>(bars.length).fill(NaN);
      const sup = new Array<number>(bars.length).fill(NaN);
      const activeHighs: number[] = [];
      const activeLows: number[] = [];
      for (let i = 0; i < bars.length; i++) {
        const p = i - r; // pivot confirmed once r bars closed after it
        if (p >= r) {
          let isHigh = true;
          let isLow = true;
          for (let j = p - r; j <= p + r; j++) {
            if (j === p) continue;
            if (bars[j].high >= bars[p].high) isHigh = false;
            if (bars[j].low <= bars[p].low) isLow = false;
          }
          if (isHigh) activeHighs.push(bars[p].high);
          if (isLow) activeLows.push(bars[p].low);
        }

        // A candle close through a level consumes it. Do not resurrect broken
        // levels if price later returns; only a newly confirmed pivot can add one.
        for (let j = activeHighs.length - 1; j >= 0; j--) {
          if (bars[i].close > activeHighs[j]) activeHighs.splice(j, 1);
        }
        for (let j = activeLows.length - 1; j >= 0; j--) {
          if (bars[i].close < activeLows[j]) activeLows.splice(j, 1);
        }

        const resistance = activeHighs.filter((level) => level >= bars[i].close).sort((a, b) => a - b)[0];
        const support = activeLows.filter((level) => level <= bars[i].close).sort((a, b) => b - a)[0];
        res[i] = resistance ?? NaN;
        sup[i] = support ?? NaN;
      }
      return [res, sup];
    },
  },
  atr: {
    id: "atr",
    name: "ATR 14",
    description: "Average true range in its own panel",
    pane: "separate",
    lines: [{ title: "ATR 14", color: "#f23645", kind: "line", width: 2 }],
    compute: (bars) => [atr(bars, 14)],
  },
};

const SPECS: Record<string, IndicatorSpec> = { ...BASE_SPECS };
for (const e of EXTRA_SPECS) SPECS[e.id] = e as IndicatorSpec;

export const INDICATOR_LIST: IndicatorSpec[] = Object.values(SPECS);

export function buildIndicatorSeries(id: IndicatorId): IndicatorSpec {
  return SPECS[id]!;
}

/** Creation and updates must use the same list: RVOL replaces plain Volume. */
export function renderedIndicatorIds(ids: IndicatorId[]): IndicatorId[] {
  return ids.includes("rvol") ? ids.filter((id) => id !== "volume") : ids;
}

export function isIndicatorId(v: unknown): v is IndicatorId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(SPECS, v);
}
