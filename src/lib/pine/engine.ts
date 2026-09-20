// A compact Pine-Script-like interpreter used by the Jenvu terminal.
// It supports the common subset of Pine v5/v6 needed for indicator plots.

export type PineCandle = {
  time: number; // seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PinePlot = {
  title: string;
  color: string;
  linewidth: number;
  values: (number | null)[];
};

export type PineResult = {
  name: string;
  overlay: boolean;
  plots: PinePlot[];
  hlines: { value: number; color: string; title: string }[];
};

export class PineError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
    this.name = "PineError";
  }
}

type Series = (number | null)[];
type Value = { t: "series"; v: Series } | { t: "num"; v: number } | { t: "str"; v: string };

const COLORS: Record<string, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  orange: "#f97316",
  yellow: "#eab308",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  lime: "#84cc16",
  teal: "#14b8a6",
  aqua: "#06b6d4",
  navy: "#1e3a8a",
  maroon: "#7f1d1d",
  olive: "#65a30d",
  silver: "#cbd5e1",
  gray: "#9ca3af",
  white: "#ffffff",
  black: "#111827",
};

/* ---------------------------------- lexer --------------------------------- */

type Tok = { k: "num" | "str" | "id" | "op"; s: string; n?: number };

function lex(src: string, line: number): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === " " || c === "\t" || c === "\r") {
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== c) {
        s += src[j];
        j += 1;
      }
      if (j >= src.length) throw new PineError("Unterminated string literal.", line);
      out.push({ k: "str", s });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && /[0-9._]/.test(src[j]!)) j += 1;
      const raw = src.slice(i, j).replace(/_/g, "");
      out.push({ k: "num", s: raw, n: Number(raw) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j]!)) j += 1;
      out.push({ k: "id", s: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", ":=", "=>"].includes(two)) {
      out.push({ k: "op", s: two });
      i += 2;
      continue;
    }
    if ("+-*/%()[],?:=<>".includes(c)) {
      out.push({ k: "op", s: c });
      i += 1;
      continue;
    }
    throw new PineError(`Unexpected character "${c}".`, line);
  }
  return out;
}

/* --------------------------------- helpers -------------------------------- */

function isNull(x: number | null | undefined): x is null | undefined {
  return x === null || x === undefined || Number.isNaN(x);
}

function toSeries(v: Value, len: number, line: number): Series {
  if (v.t === "series") return v.v;
  if (v.t === "num") return new Array<number | null>(len).fill(v.v);
  throw new PineError(`Expected a number but got the text "${v.v}".`, line);
}

function toNum(v: Value, line: number, what: string): number {
  if (v.t === "num") return v.v;
  if (v.t === "series") {
    const last = [...v.v].reverse().find((x) => !isNull(x));
    if (last !== undefined && last !== null) return last;
  }
  throw new PineError(`${what} must be a constant number.`, line);
}

function mapSeries(a: Series, b: Series, fn: (x: number, y: number) => number): Series {
  const len = Math.max(a.length, b.length);
  const out: Series = new Array(len).fill(null);
  for (let i = 0; i < len; i += 1) {
    const x = a[i];
    const y = b[i];
    if (isNull(x) || isNull(y)) continue;
    const r = fn(x, y);
    out[i] = Number.isFinite(r) ? r : null;
  }
  return out;
}

function unary(a: Series, fn: (x: number) => number): Series {
  return a.map((x) => (isNull(x) ? null : fn(x)));
}

function shift(a: Series, n: number): Series {
  if (n === 0) return a;
  return a.map((_, i) => (i - n >= 0 ? (a[i - n] ?? null) : null));
}

/* ------------------------------ ta primitives ----------------------------- */

function taSma(src: Series, len: number): Series {
  const out: Series = new Array(src.length).fill(null);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < src.length; i += 1) {
    const v = src[i];
    if (!isNull(v)) {
      sum += v;
      count += 1;
    }
    const drop = src[i - len];
    if (i >= len && !isNull(drop)) {
      sum -= drop;
      count -= 1;
    }
    out[i] = i >= len - 1 && count === len ? sum / len : null;
  }
  return out;
}

function taRma(src: Series, len: number): Series {
  const out: Series = new Array(src.length).fill(null);
  let prev: number | null = null;
  let acc = 0;
  let seen = 0;
  for (let i = 0; i < src.length; i += 1) {
    const v = src[i];
    if (isNull(v)) continue;
    if (prev === null) {
      acc += v;
      seen += 1;
      if (seen === len) {
        prev = acc / len;
        out[i] = prev;
      }
      continue;
    }
    prev = (prev * (len - 1) + v) / len;
    out[i] = prev;
  }
  return out;
}

function taEma(src: Series, len: number): Series {
  const k = 2 / (len + 1);
  const out: Series = new Array(src.length).fill(null);
  let prev: number | null = null;
  let acc = 0;
  let seen = 0;
  for (let i = 0; i < src.length; i += 1) {
    const v = src[i];
    if (isNull(v)) continue;
    if (prev === null) {
      acc += v;
      seen += 1;
      if (seen === len) {
        prev = acc / len;
        out[i] = prev;
      }
      continue;
    }
    prev = v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function taStdev(src: Series, len: number): Series {
  const mean = taSma(src, len);
  const out: Series = new Array(src.length).fill(null);
  for (let i = len - 1; i < src.length; i += 1) {
    const m = mean[i];
    if (isNull(m)) continue;
    let acc = 0;
    let ok = true;
    for (let j = i - len + 1; j <= i; j += 1) {
      const v = src[j];
      if (isNull(v)) {
        ok = false;
        break;
      }
      acc += (v - m) ** 2;
    }
    out[i] = ok ? Math.sqrt(acc / len) : null;
  }
  return out;
}

function taExtreme(src: Series, len: number, kind: "max" | "min"): Series {
  const out: Series = new Array(src.length).fill(null);
  for (let i = len - 1; i < src.length; i += 1) {
    let best: number | null = null;
    let ok = true;
    for (let j = i - len + 1; j <= i; j += 1) {
      const v = src[j];
      if (isNull(v)) {
        ok = false;
        break;
      }
      if (best === null) best = v;
      else best = kind === "max" ? Math.max(best, v) : Math.min(best, v);
    }
    out[i] = ok ? best : null;
  }
  return out;
}

function taChange(src: Series, len: number): Series {
  return mapSeries(src, shift(src, len), (a, b) => a - b);
}

function taRsi(src: Series, len: number): Series {
  const up: Series = src.map((v, i) => {
    const p = src[i - 1];
    if (isNull(v) || isNull(p)) return null;
    return Math.max(v - p, 0);
  });
  const down: Series = src.map((v, i) => {
    const p = src[i - 1];
    if (isNull(v) || isNull(p)) return null;
    return Math.max(p - v, 0);
  });
  const ru = taRma(up, len);
  const rd = taRma(down, len);
  return mapSeries(ru, rd, (u, d) => (d === 0 ? 100 : 100 - 100 / (1 + u / d)));
}

function taTr(high: Series, low: Series, close: Series): Series {
  const prev = shift(close, 1);
  return high.map((h, i) => {
    const l = low[i];
    const p = prev[i];
    if (isNull(h) || isNull(l)) return null;
    if (isNull(p)) return h - l;
    return Math.max(h - l, Math.abs(h - p), Math.abs(l - p));
  });
}

function crossSeries(a: Series, b: Series, kind: "over" | "under"): Series {
  return a.map((v, i) => {
    const w = b[i];
    const pv = a[i - 1];
    const pw = b[i - 1];
    if (isNull(v) || isNull(w) || isNull(pv) || isNull(pw)) return null;
    const now = kind === "over" ? v > w : v < w;
    const before = kind === "over" ? pv <= pw : pv >= pw;
    return now && before ? 1 : 0;
  });
}

/* --------------------------------- parser --------------------------------- */

type Ctx = {
  len: number;
  line: number;
  vars: Map<string, Value>;
  builtins: Map<string, Series>;
};

class Parser {
  private pos = 0;
  constructor(
    private toks: Tok[],
    private ctx: Ctx,
  ) {}

  private get line() {
    return this.ctx.line;
  }

  peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  eat(s: string): boolean {
    const t = this.peek();
    if (t && t.k === "op" && t.s === s) {
      this.pos += 1;
      return true;
    }
    return false;
  }

  expect(s: string) {
    if (!this.eat(s)) throw new PineError(`Expected "${s}".`, this.line);
  }

  atEnd(): boolean {
    return this.pos >= this.toks.length;
  }

  parseExpression(): Value {
    return this.parseTernary();
  }

  private parseTernary(): Value {
    const cond = this.parseOr();
    if (!this.eat("?")) return cond;
    const a = this.parseTernary();
    this.expect(":");
    const b = this.parseTernary();
    const c = toSeries(cond, this.ctx.len, this.line);
    if (a.t === "str" || b.t === "str") {
      const pick = [...c].reverse().find((x) => !isNull(x));
      return pick ? a : b;
    }
    const sa = toSeries(a, this.ctx.len, this.line);
    const sb = toSeries(b, this.ctx.len, this.line);
    return {
      t: "series",
      v: c.map((x, i) => (isNull(x) ? null : x !== 0 ? (sa[i] ?? null) : (sb[i] ?? null))),
    };
  }

  private parseOr(): Value {
    let left = this.parseAnd();
    while (this.peek()?.k === "id" && this.peek()!.s === "or") {
      this.pos += 1;
      const right = this.parseAnd();
      left = {
        t: "series",
        v: mapSeries(
          toSeries(left, this.ctx.len, this.line),
          toSeries(right, this.ctx.len, this.line),
          (a, b) => (a !== 0 || b !== 0 ? 1 : 0),
        ),
      };
    }
    return left;
  }

  private parseAnd(): Value {
    let left = this.parseCompare();
    while (this.peek()?.k === "id" && this.peek()!.s === "and") {
      this.pos += 1;
      const right = this.parseCompare();
      left = {
        t: "series",
        v: mapSeries(
          toSeries(left, this.ctx.len, this.line),
          toSeries(right, this.ctx.len, this.line),
          (a, b) => (a !== 0 && b !== 0 ? 1 : 0),
        ),
      };
    }
    return left;
  }

  private parseCompare(): Value {
    let left = this.parseAdd();
    for (;;) {
      const t = this.peek();
      if (!t || t.k !== "op" || !["==", "!=", "<", ">", "<=", ">="].includes(t.s)) return left;
      this.pos += 1;
      const right = this.parseAdd();
      const op = t.s;
      left = {
        t: "series",
        v: mapSeries(
          toSeries(left, this.ctx.len, this.line),
          toSeries(right, this.ctx.len, this.line),
          (a, b) => {
            switch (op) {
              case "==":
                return a === b ? 1 : 0;
              case "!=":
                return a !== b ? 1 : 0;
              case "<":
                return a < b ? 1 : 0;
              case ">":
                return a > b ? 1 : 0;
              case "<=":
                return a <= b ? 1 : 0;
              default:
                return a >= b ? 1 : 0;
            }
          },
        ),
      };
    }
  }

  private parseAdd(): Value {
    let left = this.parseMul();
    for (;;) {
      const t = this.peek();
      if (!t || t.k !== "op" || (t.s !== "+" && t.s !== "-")) return left;
      this.pos += 1;
      const right = this.parseMul();
      if (left.t === "num" && right.t === "num") {
        left = { t: "num", v: t.s === "+" ? left.v + right.v : left.v - right.v };
        continue;
      }
      const op = t.s;
      left = {
        t: "series",
        v: mapSeries(
          toSeries(left, this.ctx.len, this.line),
          toSeries(right, this.ctx.len, this.line),
          (a, b) => (op === "+" ? a + b : a - b),
        ),
      };
    }
  }

  private parseMul(): Value {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (!t || t.k !== "op" || !["*", "/", "%"].includes(t.s)) return left;
      this.pos += 1;
      const right = this.parseUnary();
      const op = t.s;
      if (left.t === "num" && right.t === "num") {
        left = {
          t: "num",
          v: op === "*" ? left.v * right.v : op === "/" ? left.v / right.v : left.v % right.v,
        };
        continue;
      }
      left = {
        t: "series",
        v: mapSeries(
          toSeries(left, this.ctx.len, this.line),
          toSeries(right, this.ctx.len, this.line),
          (a, b) => (op === "*" ? a * b : op === "/" ? a / b : a % b),
        ),
      };
    }
  }

  private parseUnary(): Value {
    const t = this.peek();
    if (t && t.k === "op" && t.s === "-") {
      this.pos += 1;
      const v = this.parseUnary();
      if (v.t === "num") return { t: "num", v: -v.v };
      return { t: "series", v: unary(toSeries(v, this.ctx.len, this.line), (x) => -x) };
    }
    if (t && t.k === "id" && t.s === "not") {
      this.pos += 1;
      const v = this.parseUnary();
      return {
        t: "series",
        v: unary(toSeries(v, this.ctx.len, this.line), (x) => (x === 0 ? 1 : 0)),
      };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Value {
    let v = this.parsePrimary();
    while (this.eat("[")) {
      const idx = this.parseExpression();
      this.expect("]");
      const n = Math.round(toNum(idx, this.line, "A history offset"));
      v = { t: "series", v: shift(toSeries(v, this.ctx.len, this.line), n) };
    }
    return v;
  }

  parseArgs(): { positional: Value[]; named: Map<string, Value> } {
    const positional: Value[] = [];
    const named = new Map<string, Value>();
    this.expect("(");
    if (this.eat(")")) return { positional, named };
    for (;;) {
      const t = this.peek();
      const next = this.toks[this.pos + 1];
      if (t && t.k === "id" && next && next.k === "op" && next.s === "=") {
        this.pos += 2;
        named.set(t.s, this.parseExpression());
      } else {
        positional.push(this.parseExpression());
      }
      if (this.eat(",")) continue;
      this.expect(")");
      return { positional, named };
    }
  }

  private parsePrimary(): Value {
    const t = this.peek();
    if (!t) throw new PineError("Unexpected end of expression.", this.line);
    if (t.k === "num") {
      this.pos += 1;
      return { t: "num", v: t.n! };
    }
    if (t.k === "str") {
      this.pos += 1;
      return { t: "str", v: t.s };
    }
    if (t.k === "op" && t.s === "(") {
      this.pos += 1;
      const v = this.parseExpression();
      this.expect(")");
      return v;
    }
    if (t.k === "id") {
      this.pos += 1;
      const name = t.s;
      if (this.peek()?.k === "op" && this.peek()!.s === "(") {
        const args = this.parseArgs();
        return this.callFunction(name, args.positional, args.named);
      }
      return this.readIdentifier(name);
    }
    throw new PineError(`Unexpected token "${t.s}".`, this.line);
  }

  private readIdentifier(name: string): Value {
    const { ctx } = this;
    if (name === "true") return { t: "num", v: 1 };
    if (name === "false") return { t: "num", v: 0 };
    if (name === "na") return { t: "series", v: new Array(ctx.len).fill(null) };
    if (name.startsWith("color.")) {
      const key = name.slice(6);
      const hex = COLORS[key];
      if (!hex) throw new PineError(`Unknown colour "${name}".`, this.line);
      return { t: "str", v: hex };
    }
    if (name === "math.pi") return { t: "num", v: Math.PI };
    if (name === "math.e") return { t: "num", v: Math.E };
    if (
      name === "plot.style_line" ||
      name === "display.all" ||
      name === "location.absolute" ||
      name.startsWith("size.") ||
      name.startsWith("shape.")
    )
      return { t: "str", v: name };
    const builtin = ctx.builtins.get(name);
    if (builtin) return { t: "series", v: builtin };
    const local = ctx.vars.get(name);
    if (local) return local;
    throw new PineError(`Undeclared identifier "${name}".`, this.line);
  }

  private callFunction(name: string, args: Value[], named: Map<string, Value>): Value {
    const { len, line } = this.ctx;
    const arg = (i: number, key?: string): Value | undefined =>
      args[i] ?? (key ? named.get(key) : undefined);
    const series = (i: number, key?: string): Series => {
      const v = arg(i, key);
      if (!v) throw new PineError(`${name}() is missing an argument.`, line);
      return toSeries(v, len, line);
    };
    const num = (i: number, key?: string, what = "Length"): number => {
      const v = arg(i, key);
      if (!v) throw new PineError(`${name}() is missing an argument.`, line);
      return toNum(v, line, what);
    };
    const period = (i: number, key = "length"): number => {
      const p = Math.round(num(i, key));
      if (p < 1) throw new PineError(`${name}() length must be 1 or more.`, line);
      return p;
    };

    switch (name) {
      case "ta.sma":
      case "sma":
        return { t: "series", v: taSma(series(0, "source"), period(1)) };
      case "ta.ema":
      case "ema":
        return { t: "series", v: taEma(series(0, "source"), period(1)) };
      case "ta.rma":
      case "rma":
        return { t: "series", v: taRma(series(0, "source"), period(1)) };
      case "ta.wma":
      case "wma": {
        const src = series(0, "source");
        const p = period(1);
        const out: Series = new Array(src.length).fill(null);
        const denom = (p * (p + 1)) / 2;
        for (let i = p - 1; i < src.length; i += 1) {
          let acc = 0;
          let ok = true;
          for (let j = 0; j < p; j += 1) {
            const v = src[i - p + 1 + j];
            if (isNull(v)) {
              ok = false;
              break;
            }
            acc += v * (j + 1);
          }
          out[i] = ok ? acc / denom : null;
        }
        return { t: "series", v: out };
      }
      case "ta.rsi":
      case "rsi":
        return { t: "series", v: taRsi(series(0, "source"), period(1)) };
      case "ta.stdev":
      case "stdev":
        return { t: "series", v: taStdev(series(0, "source"), period(1)) };
      case "ta.highest":
      case "highest":
        return {
          t: "series",
          v: taExtreme(
            args.length > 1 ? series(0, "source") : this.ctx.builtins.get("high")!,
            args.length > 1 ? period(1) : period(0),
            "max",
          ),
        };
      case "ta.lowest":
      case "lowest":
        return {
          t: "series",
          v: taExtreme(
            args.length > 1 ? series(0, "source") : this.ctx.builtins.get("low")!,
            args.length > 1 ? period(1) : period(0),
            "min",
          ),
        };
      case "ta.change":
      case "change":
        return {
          t: "series",
          v: taChange(series(0, "source"), args.length > 1 ? period(1) : 1),
        };
      case "ta.atr":
      case "atr": {
        const tr = taTr(
          this.ctx.builtins.get("high")!,
          this.ctx.builtins.get("low")!,
          this.ctx.builtins.get("close")!,
        );
        return { t: "series", v: taRma(tr, period(0)) };
      }
      case "ta.tr":
        return {
          t: "series",
          v: taTr(
            this.ctx.builtins.get("high")!,
            this.ctx.builtins.get("low")!,
            this.ctx.builtins.get("close")!,
          ),
        };
      case "ta.crossover":
        return { t: "series", v: crossSeries(series(0), series(1), "over") };
      case "ta.crossunder":
        return { t: "series", v: crossSeries(series(0), series(1), "under") };
      case "ta.cross": {
        const up = crossSeries(series(0), series(1), "over");
        const dn = crossSeries(series(0), series(1), "under");
        return { t: "series", v: mapSeries(up, dn, (a, b) => (a !== 0 || b !== 0 ? 1 : 0)) };
      }
      case "math.abs":
      case "abs":
        return { t: "series", v: unary(series(0), Math.abs) };
      case "math.sqrt":
      case "sqrt":
        return { t: "series", v: unary(series(0), Math.sqrt) };
      case "math.round":
      case "round":
        return { t: "series", v: unary(series(0), Math.round) };
      case "math.floor":
        return { t: "series", v: unary(series(0), Math.floor) };
      case "math.ceil":
        return { t: "series", v: unary(series(0), Math.ceil) };
      case "math.log":
        return { t: "series", v: unary(series(0), Math.log) };
      case "math.pow":
      case "pow":
        return { t: "series", v: mapSeries(series(0), series(1), (a, b) => a ** b) };
      case "math.max":
      case "max":
        return { t: "series", v: mapSeries(series(0), series(1), Math.max) };
      case "math.min":
      case "min":
        return { t: "series", v: mapSeries(series(0), series(1), Math.min) };
      case "math.avg": {
        const all = args.map((a) => toSeries(a, len, line));
        return {
          t: "series",
          v: all.reduce((acc, s) => mapSeries(acc, s, (a, b) => a + b)).map((v) =>
            isNull(v) ? null : v / all.length,
          ),
        };
      }
      case "nz": {
        const s = series(0);
        const fallback = args[1] ? toSeries(args[1], len, line) : new Array(len).fill(0);
        return { t: "series", v: s.map((v, i) => (isNull(v) ? (fallback[i] ?? 0) : v)) };
      }
      case "na":
        return { t: "series", v: series(0).map((v) => (isNull(v) ? 1 : 0)) };
      case "input":
      case "input.int":
      case "input.float":
      case "input.bool":
      case "input.source":
      case "input.string": {
        const v = arg(0, "defval");
        if (!v) throw new PineError(`${name}() needs a default value.`, line);
        return v;
      }
      case "color.new":
        return args[0] ?? { t: "str", v: "#3b82f6" };
      default:
        throw new PineError(`"${name}()" is not supported by the Jenvu Pine engine.`, line);
    }
  }
}

/* -------------------------------- compiler -------------------------------- */

const PLOT_PALETTE = ["#2962ff", "#ff9800", "#26a69a", "#ef5350", "#ab47bc", "#66bb6a"];

export function runPineScript(code: string, candles: PineCandle[]): PineResult {
  if (candles.length === 0) throw new PineError("No price data is loaded yet.", 1);
  const len = candles.length;
  const close = candles.map((c) => c.close);
  const open = candles.map((c) => c.open);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);

  const builtins = new Map<string, Series>([
    ["open", open],
    ["high", high],
    ["low", low],
    ["close", close],
    ["volume", candles.map((c) => c.volume)],
    ["hl2", candles.map((c) => (c.high + c.low) / 2)],
    ["hlc3", candles.map((c) => (c.high + c.low + c.close) / 3)],
    ["ohlc4", candles.map((c) => (c.open + c.high + c.low + c.close) / 4)],
    ["time", candles.map((c) => c.time * 1000)],
    ["bar_index", candles.map((_, i) => i)],
  ]);

  const ctx: Ctx = { len, line: 1, vars: new Map(), builtins };
  const result: PineResult = { name: "Pine indicator", overlay: true, plots: [], hlines: [] };
  let declared = false;

  const lines = code.split("\n");
  for (let ln = 0; ln < lines.length; ln += 1) {
    ctx.line = ln + 1;
    let text = lines[ln]!;
    const commentAt = findComment(text);
    if (commentAt >= 0) text = text.slice(0, commentAt);
    if (!text.trim()) continue;
    if (/^\s+/.test(lines[ln]!) && !/^\s*\)/.test(lines[ln]!)) {
      throw new PineError("Indented blocks (if / for) are not supported yet.", ln + 1);
    }

    const toks = lex(text, ln + 1);
    if (toks.length === 0) continue;
    const head = toks[0]!;

    if (head.k === "id" && (head.s === "indicator" || head.s === "study")) {
      const p = new Parser(toks.slice(1), ctx);
      const args = p.parseArgs();
      const title = args.positional[0] ?? args.named.get("title");
      if (title && title.t === "str") result.name = title.v;
      const overlay = args.named.get("overlay");
      result.overlay = overlay ? toNum(overlay, ln + 1, "overlay") !== 0 : false;
      declared = true;
      continue;
    }

    if (head.k === "id" && head.s === "plot") {
      const p = new Parser(toks.slice(1), ctx);
      const args = p.parseArgs();
      const first = args.positional[0] ?? args.named.get("series");
      if (!first) throw new PineError("plot() needs a series to draw.", ln + 1);
      const titleVal = args.positional[1] ?? args.named.get("title");
      const colorVal = args.named.get("color");
      const widthVal = args.named.get("linewidth");
      result.plots.push({
        title:
          titleVal && titleVal.t === "str"
            ? titleVal.v
            : `Plot ${result.plots.length + 1}`,
        color:
          colorVal && colorVal.t === "str"
            ? colorVal.v
            : PLOT_PALETTE[result.plots.length % PLOT_PALETTE.length]!,
        linewidth: widthVal ? Math.max(1, Math.round(toNum(widthVal, ln + 1, "linewidth"))) : 2,
        values: toSeries(first, len, ln + 1),
      });
      continue;
    }

    if (head.k === "id" && head.s === "hline") {
      const p = new Parser(toks.slice(1), ctx);
      const args = p.parseArgs();
      const v = args.positional[0] ?? args.named.get("price");
      if (!v) throw new PineError("hline() needs a price.", ln + 1);
      const titleVal = args.positional[1] ?? args.named.get("title");
      const colorVal = args.named.get("color");
      result.hlines.push({
        value: toNum(v, ln + 1, "hline price"),
        color: colorVal && colorVal.t === "str" ? colorVal.v : "#9ca3af",
        title: titleVal && titleVal.t === "str" ? titleVal.v : "",
      });
      continue;
    }

    // assignment: [var|varip] name = expr
    let idx = 0;
    if (head.k === "id" && (head.s === "var" || head.s === "varip")) idx = 1;
    const nameTok = toks[idx];
    const eq = toks[idx + 1];
    if (nameTok?.k === "id" && eq?.k === "op" && (eq.s === "=" || eq.s === ":=")) {
      const p = new Parser(toks.slice(idx + 2), ctx);
      const value = p.parseExpression();
      if (!p.atEnd()) throw new PineError("Unexpected text after the expression.", ln + 1);
      if (builtins.has(nameTok.s))
        throw new PineError(`"${nameTok.s}" is a built-in and cannot be reassigned.`, ln + 1);
      ctx.vars.set(nameTok.s, value);
      continue;
    }

    throw new PineError(
      `This line is not valid Pine for the Jenvu engine. Supported: indicator(), plot(), hline() and variable assignments.`,
      ln + 1,
    );
  }

  if (!declared)
    throw new PineError('Script must start with indicator("Name", overlay=true).', 1);
  if (result.plots.length === 0)
    throw new PineError("Nothing to draw — add at least one plot() line.", lines.length);

  return result;
}

function findComment(text: string): number {
  let inStr: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (inStr) {
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") return i;
  }
  return -1;
}
