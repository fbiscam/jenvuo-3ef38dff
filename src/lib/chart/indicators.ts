/**
 * Pure, dependency-free technical indicator math shared by the Jenvu chart,
 * the Jenvu Script engine and the AI chart-state serializer.
 * Every function returns an array aligned 1:1 with its input; bars without
 * enough history are NaN (Pine's `na`).
 */

export type OhlcvBar = {
  /** Bar open time in seconds (UTC). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const isNum = (v: number) => Number.isFinite(v);

export function sma(src: number[], length: number): number[] {
  const n = Math.max(1, Math.floor(length));
  const out = new Array<number>(src.length).fill(NaN);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (isNum(v)) {
      sum += v;
      count++;
    }
    if (i >= n) {
      const old = src[i - n];
      if (isNum(old)) {
        sum -= old;
        count--;
      }
    }
    if (i >= n - 1 && count === n) out[i] = sum / n;
  }
  return out;
}

export function ema(src: number[], length: number): number[] {
  const n = Math.max(1, Math.floor(length));
  const k = 2 / (n + 1);
  const out = new Array<number>(src.length).fill(NaN);
  let prev = NaN;
  let seedSum = 0;
  let seedCount = 0;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (!isNum(v)) {
      continue;
    }
    if (!isNum(prev)) {
      seedSum += v;
      seedCount++;
      if (seedCount === n) {
        prev = seedSum / n;
        out[i] = prev;
      }
      continue;
    }
    prev = v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's moving average (Pine `ta.rma`). */
export function rma(src: number[], length: number): number[] {
  const n = Math.max(1, Math.floor(length));
  const out = new Array<number>(src.length).fill(NaN);
  let prev = NaN;
  let seedSum = 0;
  let seedCount = 0;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (!isNum(v)) continue;
    if (!isNum(prev)) {
      seedSum += v;
      seedCount++;
      if (seedCount === n) {
        prev = seedSum / n;
        out[i] = prev;
      }
      continue;
    }
    prev = (prev * (n - 1) + v) / n;
    out[i] = prev;
  }
  return out;
}

export function wma(src: number[], length: number): number[] {
  const n = Math.max(1, Math.floor(length));
  const out = new Array<number>(src.length).fill(NaN);
  const denom = (n * (n + 1)) / 2;
  for (let i = n - 1; i < src.length; i++) {
    let acc = 0;
    let ok = true;
    for (let j = 0; j < n; j++) {
      const v = src[i - j];
      if (!isNum(v)) {
        ok = false;
        break;
      }
      acc += v * (n - j);
    }
    if (ok) out[i] = acc / denom;
  }
  return out;
}

export function stdev(src: number[], length: number): number[] {
  const n = Math.max(1, Math.floor(length));
  const mean = sma(src, n);
  const out = new Array<number>(src.length).fill(NaN);
  for (let i = n - 1; i < src.length; i++) {
    const m = mean[i];
    if (!isNum(m)) continue;
    let acc = 0;
    for (let j = 0; j < n; j++) acc += (src[i - j] - m) ** 2;
    out[i] = Math.sqrt(acc / n);
  }
  return out;
}

export function rsi(src: number[], length = 14): number[] {
  const gains = new Array<number>(src.length).fill(NaN);
  const losses = new Array<number>(src.length).fill(NaN);
  for (let i = 1; i < src.length; i++) {
    const d = src[i] - src[i - 1];
    if (!isNum(d)) continue;
    gains[i] = Math.max(d, 0);
    losses[i] = Math.max(-d, 0);
  }
  const ag = rma(gains, length);
  const al = rma(losses, length);
  return ag.map((g, i) => {
    const l = al[i];
    if (!isNum(g) || !isNum(l)) return NaN;
    if (l === 0) return g === 0 ? 50 : 100;
    return 100 - 100 / (1 + g / l);
  });
}

export function trueRange(bars: OhlcvBar[]): number[] {
  return bars.map((b, i) => {
    if (i === 0) return b.high - b.low;
    const pc = bars[i - 1].close;
    return Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
  });
}

export function atr(bars: OhlcvBar[], length = 14): number[] {
  return rma(trueRange(bars), length);
}

export function highest(src: number[], length: number): number[] {
  const n = Math.max(1, Math.floor(length));
  return src.map((_, i) => {
    if (i < n - 1) return NaN;
    let m = -Infinity;
    for (let j = i - n + 1; j <= i; j++) if (src[j] > m) m = src[j];
    return isNum(m) ? m : NaN;
  });
}

export function lowest(src: number[], length: number): number[] {
  const n = Math.max(1, Math.floor(length));
  return src.map((_, i) => {
    if (i < n - 1) return NaN;
    let m = Infinity;
    for (let j = i - n + 1; j <= i; j++) if (src[j] < m) m = src[j];
    return isNum(m) ? m : NaN;
  });
}

export function macd(
  src: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macd: number[]; signal: number[]; hist: number[] } {
  const f = ema(src, fast);
  const s = ema(src, slow);
  const line = f.map((v, i) => (isNum(v) && isNum(s[i]) ? v - s[i] : NaN));
  const sig = ema(line, signal);
  const hist = line.map((v, i) => (isNum(v) && isNum(sig[i]) ? v - sig[i] : NaN));
  return { macd: line, signal: sig, hist };
}

export function bollinger(
  src: number[],
  length = 20,
  mult = 2,
): { basis: number[]; upper: number[]; lower: number[] } {
  const basis = sma(src, length);
  const dev = stdev(src, length);
  return {
    basis,
    upper: basis.map((b, i) => b + mult * dev[i]),
    lower: basis.map((b, i) => b - mult * dev[i]),
  };
}

/** Session VWAP anchored to each UTC day. Falls back to equal weights when volume is 0. */
export function vwap(bars: OhlcvBar[]): number[] {
  let day = -1;
  let pv = 0;
  let vol = 0;
  return bars.map((b) => {
    const d = Math.floor(b.time / 86400);
    if (d !== day) {
      day = d;
      pv = 0;
      vol = 0;
    }
    const w = b.volume > 0 ? b.volume : 1;
    pv += ((b.high + b.low + b.close) / 3) * w;
    vol += w;
    return vol > 0 ? pv / vol : NaN;
  });
}

export function lastFinite(values: number[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) if (isNum(values[i])) return values[i];
  return null;
}
