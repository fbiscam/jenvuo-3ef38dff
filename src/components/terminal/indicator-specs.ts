import {
  atr,
  bollinger,
  ema,
  macd,
  rsi,
  sma,
  vwap,
  type OhlcvBar,
} from "@/lib/chart/indicators";

export type IndicatorId =
  | "volume"
  | "ema20"
  | "ema50"
  | "ema200"
  | "sma20"
  | "bb"
  | "vwap"
  | "rsi"
  | "macd"
  | "atr"
  | "sr";

export type IndicatorLine = {
  title: string;
  color: string;
  kind: "line" | "histogram";
  width?: number;
  dashed?: boolean;
  colorFor?: (bar: OhlcvBar, value: number) => string;
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

const SPECS: Record<IndicatorId, IndicatorSpec> = {
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
    description: "20-bar basis with 2 standard-deviation bands",
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
  vwap: {
    id: "vwap",
    name: "VWAP",
    description: "Volume-weighted average price,",
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
    description: "Nearest active confirmed 10-bar swing resistance and support",
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

export const INDICATOR_LIST: IndicatorSpec[] = Object.values(SPECS);

export function buildIndicatorSeries(id: IndicatorId): IndicatorSpec {
  return SPECS[id];
}

export function isIndicatorId(v: unknown): v is IndicatorId {
  return typeof v === "string" && v in SPECS;
}
