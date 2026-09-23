/**
 * User drawings on the Jenvu chart. Anchors are stored in (time, price) space
 * so drawings survive zoom, scroll, reloads and timeframe switches — and so the
 * AI can be told exactly where every drawing sits.
 */
import type { OhlcvBar } from "./indicators";

export type DrawingTool =
  | "cursor"
  | "trend"
  | "ray"
  | "arrow"
  | "hline"
  | "vline"
  | "rect"
  | "circle"
  | "fib"
  | "long"
  | "short"
  | "text";

export type Anchor = { t: number; p: number };

export type Drawing = {
  id: string;
  tool: Exclude<DrawingTool, "cursor">;
  points: Anchor[];
  color: string;
  text?: string;
  createdAt: number;
};

export const DRAWING_COLORS = ["#2962ff", "#f23645", "#089981", "#ff9800", "#9c27b0", "#131722"];

/** Tools needing a single click. */
export const SINGLE_POINT_TOOLS = new Set<DrawingTool>(["hline", "vline", "text"]);

export const TOOL_LABELS: Record<Exclude<DrawingTool, "cursor">, string> = {
  trend: "Trend line",
  ray: "Ray",
  arrow: "Arrow",
  hline: "Horizontal line",
  vline: "Vertical line",
  rect: "Rectangle",
  circle: "Circle",
  fib: "Fib retracement",
  long: "Long position",
  short: "Short position",
  text: "Text",
};

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.705, 0.79, 1];

export type Projector = {
  x: (t: number) => number | null;
  y: (p: number) => number | null;
  width: number;
  height: number;
};

function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

type Px = { x: number; y: number };

function project(d: Drawing, pr: Projector): Px[] | null {
  const pts: Px[] = [];
  for (const a of d.points) {
    const x = pr.x(a.t);
    const y = pr.y(a.p);
    if (x == null || y == null) return null;
    pts.push({ x, y });
  }
  return pts;
}

/** Target price for long/short tools: 2:1 reward unless a third point exists. */
export function positionLevels(d: Drawing): { entry: number; stop: number; target: number } | null {
  if ((d.tool !== "long" && d.tool !== "short") || d.points.length < 2) return null;
  const entry = d.points[0].p;
  const stop = d.points[1].p;
  const risk = Math.abs(entry - stop);
  const target = d.points[2]?.p ?? (d.tool === "long" ? entry + risk * 2 : entry - risk * 2);
  return { entry, stop, target };
}

export function renderDrawing(
  ctx: CanvasRenderingContext2D,
  d: Drawing,
  pr: Projector,
  opts: { selected?: boolean; hovered?: boolean; decimals?: number } = {},
) {
  const pts = project(d, pr);
  if (!pts || !pts.length) return;
  const dec = opts.decimals ?? 2;
  ctx.save();
  ctx.strokeStyle = d.color;
  ctx.fillStyle = d.color;
  ctx.lineWidth = opts.selected || opts.hovered ? 2.5 : 1.75;
  ctx.font = "11px 'JetBrains Mono', ui-monospace, monospace";
  const [a, b] = pts;

  const line = (p1: Px, p2: Px) => {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  };
  const tag = (text: string, x: number, y: number, bg: string) => {
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y - 8, w, 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x + 4, y + 4);
  };

  switch (d.tool) {
    case "trend":
    case "arrow":
      if (b) {
        line(a, b);
        if (d.tool === "arrow") {
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - 11 * Math.cos(ang - 0.4), b.y - 11 * Math.sin(ang - 0.4));
          ctx.lineTo(b.x - 11 * Math.cos(ang + 0.4), b.y - 11 * Math.sin(ang + 0.4));
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    case "ray":
      if (b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const k = dx === 0 ? 1 : (pr.width * 2) / Math.abs(dx);
        line(a, { x: a.x + dx * k, y: a.y + dy * k });
      }
      break;
    case "hline":
      ctx.setLineDash([]);
      line({ x: 0, y: a.y }, { x: pr.width, y: a.y });
      tag(d.points[0].p.toFixed(dec), pr.width - 70, a.y, d.color);
      break;
    case "vline":
      line({ x: a.x, y: 0 }, { x: a.x, y: pr.height });
      break;
    case "rect":
      if (b) {
        ctx.fillStyle = withAlpha(d.color, 0.12);
        ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      }
      break;
    case "circle":
      if (b) {
        ctx.beginPath();
        ctx.ellipse(
          (a.x + b.x) / 2,
          (a.y + b.y) / 2,
          Math.max(2, Math.abs(b.x - a.x) / 2),
          Math.max(2, Math.abs(b.y - a.y) / 2),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = withAlpha(d.color, 0.08);
        ctx.fill();
        ctx.stroke();
      }
      break;
    case "fib":
      if (b) {
        const p0 = d.points[0].p;
        const p1 = d.points[1].p;
        const x0 = Math.min(a.x, b.x);
        const x1 = Math.max(a.x, b.x) + 60;
        ctx.setLineDash([4, 3]);
        line(a, b);
        ctx.setLineDash([]);
        for (const lvl of FIB_LEVELS) {
          const price = p1 + (p0 - p1) * lvl;
          const y = pr.y(price);
          if (y == null) continue;
          ctx.strokeStyle = withAlpha(d.color, lvl === 0 || lvl === 1 ? 0.9 : 0.6);
          line({ x: x0, y }, { x: x1, y });
          ctx.fillStyle = d.color;
          ctx.fillText(`${lvl} (${price.toFixed(dec)})`, x0 + 2, y - 3);
        }
        const yTop = pr.y(Math.max(p0, p1));
        const yBot = pr.y(Math.min(p0, p1));
        const y618 = pr.y(p1 + (p0 - p1) * 0.618);
        const y79 = pr.y(p1 + (p0 - p1) * 0.79);
        if (y618 != null && y79 != null) {
          ctx.fillStyle = withAlpha(d.color, 0.1);
          ctx.fillRect(x0, Math.min(y618, y79), x1 - x0, Math.abs(y79 - y618));
        }
        void yTop;
        void yBot;
      }
      break;
    case "long":
    case "short": {
      const lv = positionLevels(d);
      if (!lv || !b) break;
      const yE = pr.y(lv.entry);
      const yS = pr.y(lv.stop);
      const yT = pr.y(lv.target);
      if (yE == null || yS == null || yT == null) break;
      const x0 = Math.min(a.x, b.x);
      const w = Math.max(80, Math.abs(b.x - a.x));
      ctx.fillStyle = "rgba(8, 153, 129, 0.18)";
      ctx.fillRect(x0, Math.min(yE, yT), w, Math.abs(yT - yE));
      ctx.fillStyle = "rgba(242, 54, 69, 0.18)";
      ctx.fillRect(x0, Math.min(yE, yS), w, Math.abs(yS - yE));
      // Clean TradingView-style zones only: no TP/SL dashed lines or text tags.
      ctx.strokeStyle = "#787b86";
      ctx.lineWidth = 1;
      line({ x: x0, y: yE }, { x: x0 + w, y: yE });
      break;
    }
    case "text": {
      const text = d.text || "Text";
      ctx.font = "600 12px 'DM Sans', system-ui, sans-serif";
      const w = ctx.measureText(text).width + 10;
      ctx.fillStyle = withAlpha(d.color, 0.14);
      ctx.fillRect(a.x - 2, a.y - 14, w, 20);
      ctx.fillStyle = d.color;
      ctx.fillText(text, a.x + 3, a.y);
      break;
    }
  }

  if (opts.selected) {
    ctx.setLineDash([]);
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function distToSegment(p: Px, a: Px, b: Px): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export type Hit = { id: string; handle: number | null };

/** Returns the top-most drawing under (x, y) and which anchor handle, if any. */
export function hitTest(drawings: Drawing[], pr: Projector, x: number, y: number, tol = 6): Hit | null {
  const p = { x, y };
  for (let i = drawings.length - 1; i >= 0; i--) {
    const d = drawings[i];
    const pts = project(d, pr);
    if (!pts) continue;
    const handle = pts.findIndex((q) => Math.hypot(q.x - x, q.y - y) <= tol + 2);
    if (handle >= 0) return { id: d.id, handle };
    const [a, b] = pts;
    let hit = false;
    switch (d.tool) {
      case "trend":
      case "arrow":
        hit = !!b && distToSegment(p, a, b) <= tol;
        break;
      case "ray":
        if (b) {
          const k = (pr.width * 2) / Math.max(1, Math.abs(b.x - a.x));
          hit = distToSegment(p, a, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }) <= tol;
        }
        break;
      case "hline":
        hit = Math.abs(y - a.y) <= tol;
        break;
      case "vline":
        hit = Math.abs(x - a.x) <= tol;
        break;
      case "rect":
      case "fib":
      case "long":
      case "short":
        if (b) {
          const lv = positionLevels(d);
          const ys = lv ? [lv.entry, lv.stop, lv.target].map((v) => pr.y(v) ?? a.y) : [a.y, b.y];
          const x0 = Math.min(a.x, b.x) - tol;
          const x1 = Math.max(a.x, b.x, a.x + 80) + tol;
          hit = x >= x0 && x <= x1 && y >= Math.min(...ys) - tol && y <= Math.max(...ys) + tol;
        }
        break;
      case "circle":
        if (b) {
          const rx = Math.max(2, Math.abs(b.x - a.x) / 2);
          const ry = Math.max(2, Math.abs(b.y - a.y) / 2);
          const nx = (x - (a.x + b.x) / 2) / rx;
          const ny = (y - (a.y + b.y) / 2) / ry;
          hit = nx * nx + ny * ny <= 1.15;
        }
        break;
      case "text":
        hit = x >= a.x - 4 && x <= a.x + 160 && y >= a.y - 16 && y <= a.y + 8;
        break;
    }
    if (hit) return { id: d.id, handle: null };
  }
  return null;
}

// ------------------------------------------------------------ AI description

const fmtTime = (t: number) => new Date(t * 1000).toISOString().slice(0, 16).replace("T", " ") + "Z";

function barsBetween(bars: OhlcvBar[], t0: number, t1: number) {
  const lo = Math.min(t0, t1);
  const hi = Math.max(t0, t1);
  return bars.filter((b) => b.time >= lo && b.time <= hi);
}

function nearestBar(bars: OhlcvBar[], t: number): OhlcvBar | null {
  let best: OhlcvBar | null = null;
  for (const b of bars) if (!best || Math.abs(b.time - t) < Math.abs(best.time - t)) best = b;
  return best;
}

const ohlc = (b: OhlcvBar, dec: number) =>
  `${fmtTime(b.time)} O${b.open.toFixed(dec)} H${b.high.toFixed(dec)} L${b.low.toFixed(dec)} C${b.close.toFixed(dec)}`;

/** Plain-text, coordinate-exact description of one drawing for the AI desk. */
export function describeDrawing(d: Drawing, bars: OhlcvBar[], dec = 2): string {
  const [a, b] = d.points;
  const pt = (x: Anchor) => `${fmtTime(x.t)} @ ${x.p.toFixed(dec)}`;
  const covered = (from: Anchor, to: Anchor, lo: number, hi: number) => {
    const inside = barsBetween(bars, from.t, to.t).filter((bar) => bar.high >= lo && bar.low <= hi);
    if (!inside.length) return " — no candles inside";
    const shown = inside.slice(0, 6).map((bar) => ohlc(bar, dec));
    const extremeHigh = inside.reduce((m, bar) => (bar.high > m.high ? bar : m), inside[0]);
    const extremeLow = inside.reduce((m, bar) => (bar.low < m.low ? bar : m), inside[0]);
    return ` — covers ${inside.length} candle(s); highest high ${extremeHigh.high.toFixed(dec)} (${fmtTime(extremeHigh.time)}), lowest low ${extremeLow.low.toFixed(dec)} (${fmtTime(extremeLow.time)}); candles: ${shown.join(" | ")}${inside.length > 6 ? " | …" : ""}`;
  };
  const label = d.text ? ` labelled "${d.text}"` : "";
  switch (d.tool) {
    case "trend":
    case "arrow":
    case "ray":
      return `${TOOL_LABELS[d.tool]}${label} from ${pt(a)} to ${b ? pt(b) : "?"}${b ? ` (${b.p >= a.p ? "rising" : "falling"} ${Math.abs(b.p - a.p).toFixed(dec)})` : ""}`;
    case "hline": {
      const bar = bars.at(-1);
      const rel = bar ? (a.p > bar.close ? "above" : "below") : "";
      return `Horizontal line${label} at ${a.p.toFixed(dec)}${rel ? ` (${rel} current close ${bar!.close.toFixed(dec)})` : ""}`;
    }
    case "vline": {
      const bar = nearestBar(bars, a.t);
      return `Vertical line${label} at ${fmtTime(a.t)}${bar ? ` — candle ${ohlc(bar, dec)}` : ""}`;
    }
    case "rect":
    case "circle": {
      if (!b) return TOOL_LABELS[d.tool];
      const lo = Math.min(a.p, b.p);
      const hi = Math.max(a.p, b.p);
      return `${TOOL_LABELS[d.tool]}${label} spanning ${fmtTime(Math.min(a.t, b.t))} → ${fmtTime(Math.max(a.t, b.t))}, price ${lo.toFixed(dec)}–${hi.toFixed(dec)}${covered(a, b, lo, hi)}`;
    }
    case "fib": {
      if (!b) return "Fib retracement";
      const levels = FIB_LEVELS.map((l) => `${l}=${(b.p + (a.p - b.p) * l).toFixed(dec)}`).join(", ");
      return `Fib retracement from ${pt(a)} to ${pt(b)}: ${levels}`;
    }
    case "long":
    case "short": {
      const lv = positionLevels(d);
      if (!lv) return TOOL_LABELS[d.tool];
      const rr = Math.abs(lv.target - lv.entry) / Math.max(1e-9, Math.abs(lv.entry - lv.stop));
      return `${TOOL_LABELS[d.tool]} planned at ${fmtTime(a.t)}: entry ${lv.entry.toFixed(dec)}, stop ${lv.stop.toFixed(dec)}, target ${lv.target.toFixed(dec)}, RR 1:${rr.toFixed(2)}`;
    }
    case "text": {
      const bar = nearestBar(bars, a.t);
      return `Text note "${d.text ?? ""}" placed at ${pt(a)}${bar ? ` — nearest candle ${ohlc(bar, dec)}` : ""}`;
    }
  }
}
