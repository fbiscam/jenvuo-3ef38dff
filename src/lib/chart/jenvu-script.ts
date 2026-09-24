/**
 * Jenvu Script — a safe, Pine-style indicator language evaluated in the browser.
 *
 * Supports the everyday Pine v5 subset: assignments (`=`, `:=`), arithmetic,
 * comparisons, `and/or/not`, ternaries, history references (`close[1]`),
 * named arguments, `ta.*` / `math.*` / `input.*` helpers, `indicator()`,
 * `plot()`, `plotshape()`, `plotchar()` and `hline()`.
 *
 * No `eval` / `Function` is used: source is tokenized, parsed into an AST and
 * interpreted over whole price series.
 */
import {
  atr,
  ema,
  highest,
  lowest,
  rma,
  rsi,
  sma,
  stdev,
  trueRange,
  vwap,
  wma,
  type OhlcvBar,
} from "./indicators";

export class ScriptError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(`Line ${line}: ${message}`);
    this.line = line;
  }
}

type Val = number | number[] | string | string[];

export type ScriptPlot = {
  title: string;
  color: string;
  colors?: Array<string | undefined>;
  lineWidth: number;
  values: number[];
};

export type ScriptShape = {
  title: string;
  location: "above" | "below";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle" | "square";
  text: string;
  bars: number[];
};

export type ScriptHLine = { title: string; price: number; color: string };

export type ScriptResult = {
  name: string;
  overlay: boolean;
  plots: ScriptPlot[];
  shapes: ScriptShape[];
  hlines: ScriptHLine[];
  warnings: string[];
  /** Latest finite value of every numeric variable assigned by the script. */
  variables: Record<string, number | null>;
};

// ---------------------------------------------------------------- tokenizer

type Tok =
  | { t: "num"; v: number; line: number }
  | { t: "str"; v: string; line: number }
  | { t: "color"; v: string; line: number }
  | { t: "id"; v: string; line: number }
  | { t: "op"; v: string; line: number }
  | { t: "nl"; line: number }
  | { t: "eof"; line: number };

const OPS = ["=>", ":=", "==", "!=", ">=", "<=", "+", "-", "*", "/", "%", "(", ")", "[", "]", ",", "=", ">", "<", "?", ":"];

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  let line = 1;
  let depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\n") {
      if (depth === 0 && out.length && out[out.length - 1].t !== "nl") out.push({ t: "nl", line });
      line++;
      i++;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && /[0-9._eE]/.test(src[j])) {
        if ((src[j] === "e" || src[j] === "E") && /[+-]/.test(src[j + 1] ?? "")) j++;
        j++;
      }
      const v = Number(src.slice(i, j).replace(/_/g, ""));
      if (!Number.isFinite(v)) throw new ScriptError(`Invalid number "${src.slice(i, j)}"`, line);
      out.push({ t: "num", v, line });
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== ch) {
        if (src[j] === "\n") throw new ScriptError("Unterminated string", line);
        if (src[j] === "\\" && j + 1 < src.length) {
          s += src[j + 1];
          j += 2;
          continue;
        }
        s += src[j];
        j++;
      }
      if (src[j] !== ch) throw new ScriptError("Unterminated string", line);
      out.push({ t: "str", v: s, line });
      i = j + 1;
      continue;
    }
    if (ch === "#") {
      const m = /^#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/.exec(src.slice(i));
      if (!m) throw new ScriptError("Invalid color literal", line);
      out.push({ t: "color", v: m[0], line });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++;
      out.push({ t: "id", v: src.slice(i, j), line });
      i = j;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new ScriptError(`Unexpected character "${ch}"`, line);
    if (op === "(" || op === "[") depth++;
    if (op === ")" || op === "]") depth = Math.max(0, depth - 1);
    out.push({ t: "op", v: op, line });
    i += op.length;
  }
  out.push({ t: "eof", line });
  return out;
}

// ---------------------------------------------------------------- parser

type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "id"; name: string; line: number }
  | { k: "un"; op: string; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "tern"; c: Node; a: Node; b: Node }
  | { k: "call"; name: string; args: Node[]; named: Record<string, Node>; line: number }
  | { k: "idx"; a: Node; off: Node };

type Stmt =
  | { k: "assign"; name: string; expr: Node; line: number }
  | { k: "expr"; expr: Node; line: number };

const TYPE_KEYWORDS = new Set(["var", "varip", "float", "int", "bool", "series", "simple", "string", "color", "const"]);
const UNSUPPORTED = new Set(["if", "for", "while", "switch", "else", "import", "export", "method", "type"]);

class Parser {
  private p = 0;
  constructor(private toks: Tok[]) {}
  private peek(o = 0): Tok {
    return this.toks[Math.min(this.p + o, this.toks.length - 1)];
  }
  private next(): Tok {
    return this.toks[this.p++];
  }
  private isOp(v: string, o = 0) {
    const t = this.peek(o);
    return t.t === "op" && t.v === v;
  }
  private expectOp(v: string) {
    const t = this.next();
    if (t.t !== "op" || t.v !== v) throw new ScriptError(`Expected "${v}"`, t.line);
  }

  program(): Stmt[] {
    const out: Stmt[] = [];
    while (this.peek().t !== "eof") {
      if (this.peek().t === "nl") {
        this.next();
        continue;
      }
      out.push(this.statement());
      const t = this.peek();
      if (t.t !== "nl" && t.t !== "eof") throw new ScriptError("Unexpected token after statement", t.line);
    }
    return out;
  }

  private statement(): Stmt {
    const first = this.peek();
    if (first.t === "id" && UNSUPPORTED.has(first.v))
      throw new ScriptError(`"${first.v}" blocks are not supported yet — use a ternary (cond ? a : b)`, first.line);
    while (this.peek().t === "id" && TYPE_KEYWORDS.has((this.peek() as { v: string }).v) && this.peek(1).t === "id")
      this.next();
    const t = this.peek();
    if (t.t === "id" && (this.isOp("=", 1) || this.isOp(":=", 1))) {
      this.next();
      this.next();
      return { k: "assign", name: t.v, expr: this.expr(), line: t.line };
    }
    return { k: "expr", expr: this.expr(), line: t.line };
  }

  private expr(): Node {
    const c = this.or();
    if (this.isOp("?")) {
      this.next();
      const a = this.expr();
      this.expectOp(":");
      const b = this.expr();
      return { k: "tern", c, a, b };
    }
    return c;
  }
  private or(): Node {
    let a = this.and();
    while (this.peek().t === "id" && (this.peek() as { v: string }).v === "or") {
      this.next();
      a = { k: "bin", op: "or", a, b: this.and() };
    }
    return a;
  }
  private and(): Node {
    let a = this.eq();
    while (this.peek().t === "id" && (this.peek() as { v: string }).v === "and") {
      this.next();
      a = { k: "bin", op: "and", a, b: this.eq() };
    }
    return a;
  }
  private eq(): Node {
    let a = this.cmp();
    while (this.isOp("==") || this.isOp("!=")) {
      const op = (this.next() as { v: string }).v;
      a = { k: "bin", op, a, b: this.cmp() };
    }
    return a;
  }
  private cmp(): Node {
    let a = this.add();
    while (this.isOp(">") || this.isOp("<") || this.isOp(">=") || this.isOp("<=")) {
      const op = (this.next() as { v: string }).v;
      a = { k: "bin", op, a, b: this.add() };
    }
    return a;
  }
  private add(): Node {
    let a = this.mul();
    while (this.isOp("+") || this.isOp("-")) {
      const op = (this.next() as { v: string }).v;
      a = { k: "bin", op, a, b: this.mul() };
    }
    return a;
  }
  private mul(): Node {
    let a = this.unary();
    while (this.isOp("*") || this.isOp("/") || this.isOp("%")) {
      const op = (this.next() as { v: string }).v;
      a = { k: "bin", op, a, b: this.unary() };
    }
    return a;
  }
  private unary(): Node {
    if (this.isOp("-") || this.isOp("+")) {
      const op = (this.next() as { v: string }).v;
      return { k: "un", op, a: this.unary() };
    }
    if (this.peek().t === "id" && (this.peek() as { v: string }).v === "not") {
      this.next();
      return { k: "un", op: "not", a: this.unary() };
    }
    return this.postfix();
  }
  private postfix(): Node {
    let a = this.primary();
    while (this.isOp("[")) {
      this.next();
      const off = this.expr();
      this.expectOp("]");
      a = { k: "idx", a, off };
    }
    return a;
  }
  private primary(): Node {
    const t = this.next();
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "color") return { k: "str", v: t.v };
    if (t.t === "op" && t.v === "(") {
      const e = this.expr();
      this.expectOp(")");
      return e;
    }
    if (t.t === "op" && t.v === "=>")
      throw new ScriptError("Custom functions (=>) are not supported yet", t.line);
    if (t.t === "id") {
      if (this.isOp("(")) {
        this.next();
        const args: Node[] = [];
        const named: Record<string, Node> = {};
        while (!this.isOp(")")) {
          const a = this.peek();
          if (a.t === "id" && this.isOp("=", 1)) {
            this.next();
            this.next();
            named[a.v] = this.expr();
          } else {
            args.push(this.expr());
          }
          if (this.isOp(",")) this.next();
          else if (!this.isOp(")")) throw new ScriptError('Expected "," or ")"', this.peek().line);
        }
        this.expectOp(")");
        if (this.isOp("=>")) throw new ScriptError("Custom functions (=>) are not supported yet", t.line);
        return { k: "call", name: t.v, args, named, line: t.line };
      }
      return { k: "id", name: t.v, line: t.line };
    }
    throw new ScriptError("Unexpected token", t.line);
  }
}

// ---------------------------------------------------------------- evaluator

const COLORS: Record<string, string> = {
  red: "#f23645",
  green: "#089981",
  blue: "#2962ff",
  orange: "#ff9800",
  yellow: "#f7c948",
  purple: "#9c27b0",
  fuchsia: "#e040fb",
  aqua: "#00bcd4",
  teal: "#00897b",
  lime: "#00e676",
  maroon: "#880e4f",
  navy: "#311b92",
  olive: "#808000",
  silver: "#b2b5be",
  gray: "#787b86",
  white: "#ffffff",
  black: "#131722",
};

const PALETTE = ["#2962ff", "#ff9800", "#9c27b0", "#00897b", "#f23645", "#089981", "#e040fb"];

const isSeries = (v: Val): v is number[] => Array.isArray(v) && (v.length === 0 || typeof v[0] !== "string");
const truthy = (x: number) => Number.isFinite(x) && x !== 0;

function normName(name: string): string {
  return name.replace(/^(ta|math|str)\./, "");
}

function withAlpha(hex: string, transp: number): string {
  const m = /^#([0-9a-f]{6})/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const alpha = Math.max(0, Math.min(100, 100 - transp)) / 100;
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha.toFixed(2)})`;
}

export function runJenvuScript(source: string, bars: OhlcvBar[]): ScriptResult {
  if (source.length > 20_000) throw new ScriptError("Script is too long (20,000 characters max)", 1);
  const stmts = new Parser(tokenize(source)).program();
  if (stmts.length > 300) throw new ScriptError("Too many statements (300 max)", 1);

  const n = bars.length;
  const col = (f: (b: OhlcvBar) => number) => bars.map(f);
  const builtins: Record<string, number[]> = {
    open: col((b) => b.open),
    high: col((b) => b.high),
    low: col((b) => b.low),
    close: col((b) => b.close),
    volume: col((b) => b.volume),
    hl2: col((b) => (b.high + b.low) / 2),
    hlc3: col((b) => (b.high + b.low + b.close) / 3),
    ohlc4: col((b) => (b.open + b.high + b.low + b.close) / 4),
    time: col((b) => b.time * 1000),
    bar_index: bars.map((_, i) => i),
    tr: trueRange(bars),
    "ta.tr": trueRange(bars),
    "ta.vwap": vwap(bars),
    vwap: vwap(bars),
  };
  const vars = new Map<string, Val>();
  const result: ScriptResult = {
    name: "Jenvu Script",
    overlay: true,
    plots: [],
    shapes: [],
    hlines: [],
    warnings: [],
    variables: {},
  };

  const toSeries = (v: Val, line: number): number[] => {
    if (typeof v === "number") return new Array<number>(n).fill(v);
    if (isSeries(v)) return v;
    throw new ScriptError("Expected a number or series, got text", line);
  };
  const toNum = (v: Val, line: number): number => {
    if (typeof v === "number") return v;
    if (isSeries(v)) {
      for (let i = v.length - 1; i >= 0; i--) if (Number.isFinite(v[i])) return v[i];
      return NaN;
    }
    throw new ScriptError("Expected a number", line);
  };
  const toStr = (v: Val | undefined, fallback: string): string =>
    typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? String(v[v.length - 1]) : fallback;

  const binNum = (a: Val, b: Val, line: number, f: (x: number, y: number) => number): Val => {
    if (typeof a === "number" && typeof b === "number") return f(a, b);
    const sa = toSeries(a, line);
    const sb = toSeries(b, line);
    return sa.map((x, i) => f(x, sb[i]));
  };

  const cmpF: Record<string, (x: number, y: number) => number> = {
    ">": (x, y) => (Number.isFinite(x) && Number.isFinite(y) && x > y ? 1 : 0),
    "<": (x, y) => (Number.isFinite(x) && Number.isFinite(y) && x < y ? 1 : 0),
    ">=": (x, y) => (Number.isFinite(x) && Number.isFinite(y) && x >= y ? 1 : 0),
    "<=": (x, y) => (Number.isFinite(x) && Number.isFinite(y) && x <= y ? 1 : 0),
    "==": (x, y) => (Number.isFinite(x) && Number.isFinite(y) && x === y ? 1 : 0),
    "!=": (x, y) => (Number.isFinite(x) && Number.isFinite(y) && x !== y ? 1 : 0),
    "+": (x, y) => x + y,
    "-": (x, y) => x - y,
    "*": (x, y) => x * y,
    "/": (x, y) => (y === 0 ? NaN : x / y),
    "%": (x, y) => (y === 0 ? NaN : x % y),
    and: (x, y) => (truthy(x) && truthy(y) ? 1 : 0),
    or: (x, y) => (truthy(x) || truthy(y) ? 1 : 0),
  };

  const ident = (name: string, line: number): Val => {
    if (vars.has(name)) return vars.get(name)!;
    if (name in builtins) return builtins[name];
    if (name === "true") return 1;
    if (name === "false") return 0;
    if (name === "na") return NaN;
    if (name.startsWith("color.")) {
      const c = COLORS[name.slice(6)];
      if (c) return c;
    }
    if (name.startsWith("location.")) return name.slice(9);
    if (name.startsWith("shape.")) return name.slice(6);
    if (name.startsWith("size.") || name.startsWith("plot.style") || name.startsWith("hline.style"))
      return name;
    throw new ScriptError(`Unknown name "${name}"`, line);
  };

  const evalNode = (node: Node): Val => {
    switch (node.k) {
      case "num":
        return node.v;
      case "str":
        return node.v;
      case "id":
        return ident(node.name, node.line);
      case "un": {
        const a = evalNode(node.a);
        if (node.op === "not")
          return typeof a === "number" ? (truthy(a) ? 0 : 1) : toSeries(a, 0).map((x) => (truthy(x) ? 0 : 1));
        if (node.op === "-") return typeof a === "number" ? -a : toSeries(a, 0).map((x) => -x);
        return a;
      }
      case "bin": {
        const a = evalNode(node.a);
        const b = evalNode(node.b);
        const f = cmpF[node.op];
        return binNum(a, b, 0, f);
      }
      case "tern": {
        const c = evalNode(node.c);
        const a = evalNode(node.a);
        const b = evalNode(node.b);
        if (typeof c === "number") return truthy(c) ? a : b;
        const cs = toSeries(c, 0);
        if (typeof a === "string" || typeof b === "string") {
          const as = toStr(a, "");
          const bs = toStr(b, "");
          return cs.map((x) => (truthy(x) ? as : bs));
        }
        const sa = toSeries(a, 0);
        const sb = toSeries(b, 0);
        return cs.map((x, i) => (truthy(x) ? sa[i] : sb[i]));
      }
      case "idx": {
        const a = evalNode(node.a);
        const off = Math.floor(toNum(evalNode(node.off), 0));
        if (typeof a === "number" || typeof a === "string") return a;
        if (!isSeries(a)) return a;
        return a.map((_, i) => (i - off >= 0 && i - off < n ? a[i - off] : NaN));
      }
      case "call":
        return call(node);
    }
  };

  const call = (node: Extract<Node, { k: "call" }>): Val => {
    const { line } = node;
    const raw = node.name;
    const name = normName(raw);
    const arg = (i: number, key?: string): Val | undefined =>
      key && node.named[key] ? evalNode(node.named[key]) : node.args[i] ? evalNode(node.args[i]) : undefined;
    const req = (i: number, key?: string): Val => {
      const v = arg(i, key);
      if (v === undefined) throw new ScriptError(`${raw}() is missing an argument`, line);
      return v;
    };
    const srcLen = (fn: (s: number[], l: number) => number[]) =>
      fn(toSeries(req(0, "source"), line), toNum(req(1, "length"), line));

    if (raw.startsWith("input")) {
      const v = arg(0, "defval");
      if (v === undefined) throw new ScriptError(`${raw}() needs a default value`, line);
      return v;
    }
    switch (raw) {
      case "indicator":
      case "study":
      case "strategy": {
        result.name = toStr(arg(0, "title"), result.name);
        const ov = arg(-1, "overlay");
        if (ov !== undefined) result.overlay = truthy(toNum(ov, line));
        return NaN;
      }
      case "plot": {
        const values = toSeries(req(0, "series"), line);
        const colorVal = arg(2, "color");
        const idx = result.plots.length;
        const plot: ScriptPlot = {
          title: toStr(arg(1, "title"), `Plot ${idx + 1}`),
          color: PALETTE[idx % PALETTE.length],
          lineWidth: Math.max(1, Math.min(4, toNum(arg(3, "linewidth") ?? 2, line))),
          values,
        };
        if (typeof colorVal === "string") plot.color = colorVal;
        else if (Array.isArray(colorVal) && typeof colorVal[0] === "string") {
          plot.colors = colorVal as string[];
          plot.color = String(colorVal[colorVal.length - 1]);
        }
        result.plots.push(plot);
        return values;
      }
      case "plotshape":
      case "plotchar":
      case "plotarrow": {
        const series = toSeries(req(0, "series"), line);
        const loc = toStr(arg(3, "location"), "abovebar").toLowerCase();
        const style = toStr(arg(2, "style"), raw === "plotchar" ? "circle" : "").toLowerCase();
        const above = loc.includes("above") || loc === "top";
        const shape: ScriptShape["shape"] = style.includes("circle") || style.includes("cross")
          ? "circle"
          : style.includes("square") || style.includes("diamond") || style.includes("flag")
            ? "square"
            : style.includes("down")
              ? "arrowDown"
              : style.includes("up")
                ? "arrowUp"
                : above
                  ? "arrowDown"
                  : "arrowUp";
        const barsHit: number[] = [];
        series.forEach((v, i) => truthy(v) && barsHit.push(i));
        result.shapes.push({
          title: toStr(arg(1, "title"), `Shape ${result.shapes.length + 1}`),
          location: above ? "above" : "below",
          color: toStr(arg(4, "color"), above ? COLORS.red : COLORS.green),
          shape,
          text: toStr(arg(-1, "text"), ""),
          bars: barsHit,
        });
        return series;
      }
      case "hline": {
        const price = toNum(req(0, "price"), line);
        result.hlines.push({
          title: toStr(arg(1, "title"), `Level ${result.hlines.length + 1}`),
          price,
          color: toStr(arg(2, "color"), COLORS.gray),
        });
        return price;
      }
      case "alertcondition":
      case "bgcolor":
      case "barcolor":
      case "fill":
      case "label.new":
      case "line.new":
      case "box.new":
        result.warnings.push(`${raw}() is ignored on the Jenvu chart (line ${line})`);
        return NaN;
      case "color.new": {
        const c = toStr(req(0, "color"), COLORS.gray);
        return withAlpha(c, toNum(arg(1, "transp") ?? 0, line));
      }
      case "color.rgb": {
        const [r, g, b] = [0, 1, 2].map((i) => Math.max(0, Math.min(255, Math.round(toNum(req(i), line)))));
        const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
        return withAlpha(hex, toNum(arg(3, "transp") ?? 0, line));
      }
    }
    switch (name) {
      case "sma":
        return srcLen(sma);
      case "ema":
        return srcLen(ema);
      case "rma":
        return srcLen(rma);
      case "wma":
        return srcLen(wma);
      case "stdev":
        return srcLen(stdev);
      case "rsi":
        return srcLen(rsi);
      case "atr":
        return atr(bars, toNum(req(0, "length"), line));
      case "highest":
        return node.args.length >= 2 || node.named.source
          ? srcLen(highest)
          : highest(builtins.high, toNum(req(0, "length"), line));
      case "lowest":
        return node.args.length >= 2 || node.named.source
          ? srcLen(lowest)
          : lowest(builtins.low, toNum(req(0, "length"), line));
      case "sum": {
        const s = toSeries(req(0, "source"), line);
        const len = Math.max(1, Math.floor(toNum(req(1, "length"), line)));
        return sma(s, len).map((v) => v * len);
      }
      case "change":
      case "mom": {
        const s = toSeries(req(0, "source"), line);
        const len = Math.max(1, Math.floor(toNum(arg(1, "length") ?? 1, line)));
        return s.map((v, i) => (i >= len ? v - s[i - len] : NaN));
      }
      case "crossover":
      case "crossunder":
      case "cross": {
        const a = toSeries(req(0), line);
        const b = toSeries(req(1), line);
        return a.map((v, i) => {
          if (i === 0) return 0;
          const up = a[i - 1] <= b[i - 1] && v > b[i];
          const dn = a[i - 1] >= b[i - 1] && v < b[i];
          if (name === "crossover") return up ? 1 : 0;
          if (name === "crossunder") return dn ? 1 : 0;
          return up || dn ? 1 : 0;
        });
      }
      case "nz": {
        const v = req(0);
        const r = toNum(arg(1) ?? 0, line);
        return typeof v === "number" ? (Number.isFinite(v) ? v : r) : toSeries(v, line).map((x) => (Number.isFinite(x) ? x : r));
      }
      case "na": {
        const v = req(0);
        return typeof v === "number" ? (Number.isFinite(v) ? 0 : 1) : toSeries(v, line).map((x) => (Number.isFinite(x) ? 0 : 1));
      }
      case "abs":
      case "sqrt":
      case "log":
      case "exp":
      case "floor":
      case "ceil":
      case "sign": {
        const f = Math[name as "abs"];
        const v = req(0);
        return typeof v === "number" ? f(v) : toSeries(v, line).map((x) => f(x));
      }
      case "round": {
        const v = req(0);
        const p = 10 ** Math.floor(toNum(arg(1) ?? 0, line));
        const f = (x: number) => Math.round(x * p) / p;
        return typeof v === "number" ? f(v) : toSeries(v, line).map(f);
      }
      case "pow":
        return binNum(req(0), req(1), line, (x, y) => x ** y);
      case "max":
      case "min": {
        if (node.args.length < 2) throw new ScriptError(`${raw}() needs at least two values`, line);
        let acc = evalNode(node.args[0]);
        for (let i = 1; i < node.args.length; i++)
          acc = binNum(acc, evalNode(node.args[i]), line, name === "max" ? Math.max : Math.min);
        return acc;
      }
      case "avg": {
        const vals = node.args.map(evalNode);
        let acc: Val = 0;
        for (const v of vals) acc = binNum(acc, v, line, (x, y) => x + y);
        return binNum(acc, vals.length, line, (x, y) => x / y);
      }
      case "tostring":
        return String(toNum(req(0), line));
    }
    throw new ScriptError(`Unknown function "${raw}()"`, line);
  };

  for (const s of stmts) {
    try {
      if (s.k === "assign") vars.set(s.name, evalNode(s.expr));
      else evalNode(s.expr);
    } catch (err) {
      if (err instanceof ScriptError) {
        if (err.line === 0) throw new ScriptError(err.message.replace(/^Line 0: /, ""), s.line);
        throw err;
      }
      throw new ScriptError(err instanceof Error ? err.message : String(err), s.line);
    }
  }
  for (const [k, v] of vars) {
    if (typeof v === "number") result.variables[k] = Number.isFinite(v) ? v : null;
    else if (isSeries(v)) {
      let last: number | null = null;
      for (let i = v.length - 1; i >= 0; i--)
        if (Number.isFinite(v[i])) {
          last = v[i];
          break;
        }
      result.variables[k] = last;
    }
  }
  return result;
}

export const SCRIPT_TEMPLATES: Array<{ name: string; source: string }> = [
  {
    name: "EMA Cross",
    source: `//@version=5
indicator("EMA Cross", overlay=true)
fastLen = input.int(9, "Fast")
slowLen = input.int(21, "Slow")
fast = ta.ema(close, fastLen)
slow = ta.ema(close, slowLen)
plot(fast, "Fast EMA", color=color.orange)
plot(slow, "Slow EMA", color=color.blue)
plotshape(ta.crossover(fast, slow), "Bull cross", location=location.belowbar, color=color.green, style=shape.triangleup)
plotshape(ta.crossunder(fast, slow), "Bear cross", location=location.abovebar, color=color.red, style=shape.triangledown)`,
  },
  {
    name: "Mother + Inside Bar",
    source: `//@version=5
indicator("Mother + Inside Bar", overlay=true)
inside = high < high[1] and low > low[1]
plotshape(inside, "Inside bar", location=location.abovebar, color="#38bdf8", style=shape.circle, text="IB")`,
  },
  {
    name: "RSI",
    source: `//@version=5
indicator("RSI 14", overlay=false)
r = ta.rsi(close, 14)
plot(r, "RSI", color=color.purple)
hline(70, "Overbought", color=color.red)
hline(30, "Oversold", color=color.green)`,
  },
  {
    name: "ATR Bands",
    source: `//@version=5
indicator("ATR Bands", overlay=true)
basis = ta.ema(close, 20)
a = ta.atr(14)
plot(basis, "Basis", color=color.gray)
plot(basis + a * 1.5, "Upper", color=color.teal)
plot(basis - a * 1.5, "Lower", color=color.teal)`,
  },
];
