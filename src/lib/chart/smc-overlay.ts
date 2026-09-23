/**
 * Jenvu SMC overlays for the chart. Uses exactly the same deterministic
 * engines and the same 150-closed-candle window as the Terminal AI evidence,
 * so what the user sees on the chart is what the AI verifies.
 */
import {
  detectMarketStructureEvidence,
  type StructureBreak,
  type StructurePivot,
} from "@/lib/analysis/market-structure-evidence";
import {
  detectPoiEvidence,
  type FairValueGap,
  type OrderBlockZone,
} from "@/lib/analysis/poi-evidence";
import type { OhlcvBar } from "./indicators";

export const SMC_WINDOW = 150;
/** HH/HL/LH/LL chart labels use a Fractals-style swing length of 10 bars each side. */
export const FRACTAL_RADIUS = 10;
/** Closed bars scanned for 10-bar fractal labels (wider window so enough swings form). */
export const FRACTAL_WINDOW = 400;

export type LivePivot = {
  t: number;
  price: number;
  kind: "high" | "low";
  label: "H" | "L" | "HH" | "HL" | "LH" | "LL";
  /** True when the swing sits on the still-forming candle. */
  onFormingCandle: boolean;
  /** Candles printed after the swing so far (needs FRACTAL_RADIUS to confirm). */
  barsAfter: number;
};

export type SmcOverlay = {
  pivots: StructurePivot[];
  livePivots: LivePivot[];
  breaks: Array<StructureBreak & { fromT: number }>;
  fvgs: FairValueGap[];
  orderBlocks: OrderBlockZone[];
  buySide: number[];
  sellSide: number[];
  trend: string;
  windowStart: number | null;
};

export type SmcToggles = {
  structure: boolean;
  breaks: boolean;
  fvg: boolean;
  orderBlocks: boolean;
  liquidity: boolean;
};

export const DEFAULT_SMC: SmcToggles = {
  structure: true,
  breaks: true,
  fvg: false,
  orderBlocks: false,
  liquidity: true,
};

type Candle = { t: number; o: number; h: number; l: number; c: number };

const toCandle = (b: OhlcvBar): Candle => ({ t: b.time * 1000, o: b.open, h: b.high, l: b.low, c: b.close });

/**
 * Provisional swings in the unconfirmed tail: a candle whose high (low) beats
 * the previous FRACTAL_RADIUS candles and every candle printed after it so far,
 * including the forming one. It updates live as the current candle moves and
 * becomes a confirmed pivot once FRACTAL_RADIUS later candles close.
 */
export function computeLivePivots(
  closed: Candle[],
  forming: Candle | null,
  confirmed: StructurePivot[],
  radius = FRACTAL_RADIUS,
): LivePivot[] {
  const all = forming ? [...closed, forming] : closed;
  const firstUnconfirmed = Math.max(radius, closed.length - radius);
  const out: LivePivot[] = [];
  for (const kind of ["high", "low"] as const) {
    const val = (c: Candle) => (kind === "high" ? c.h : c.l);
    const beats = (a: number, b: number) => (kind === "high" ? a > b : a < b);
    for (let i = all.length - 1; i >= firstUnconfirmed; i--) {
      const v = val(all[i]);
      let ok = true;
      for (let k = i - radius; k < i && ok; k++) if (!beats(v, val(all[k]))) ok = false;
      for (let k = i + 1; k < all.length && ok; k++) if (!beats(v, val(all[k]))) ok = false;
      if (!ok) continue;
      const prev = [...confirmed].reverse().find((p) => p.kind === kind);
      const label: LivePivot["label"] = !prev
        ? kind === "high"
          ? "H"
          : "L"
        : kind === "high"
          ? v > prev.price
            ? "HH"
            : "LH"
          : v < prev.price
            ? "LL"
            : "HL";
      out.push({
        t: all[i].t,
        price: v,
        kind,
        label,
        onFormingCandle: forming != null && i === all.length - 1,
        barsAfter: all.length - 1 - i,
      });
      break;
    }
  }
  return out;
}

/**
 * `bars` must be closed candles only (the forming candle excluded); pass the
 * forming candle separately so live HH/HL/LH/LL labels can follow it.
 */
export function computeSmcOverlay(
  bars: OhlcvBar[],
  currentPrice: number | null,
  forming: OhlcvBar | null = null,
): SmcOverlay {
  const recent = bars.slice(-SMC_WINDOW).map(toCandle);
  if (recent.length < 10) {
    return {
      pivots: [],
      livePivots: [],
      breaks: [],
      fvgs: [],
      orderBlocks: [],
      buySide: [],
      sellSide: [],
      trend: "undecided",
      windowStart: null,
    };
  }
  const structure = detectMarketStructureEvidence(recent);
  const poi = detectPoiEvidence(recent);
  const price = currentPrice ?? recent[recent.length - 1].c;

  // HH/HL/LH/LL labels: 10-bar fractal swings (like the Fractals indicator).
  const fractalBars = bars.slice(-FRACTAL_WINDOW).map(toCandle);
  const fractal = detectMarketStructureEvidence(fractalBars, FRACTAL_RADIUS);
  const pivotsLabelled = fractal.pivots.filter((p) => p.label.length === 2);
  const livePivots = computeLivePivots(fractalBars, forming ? toCandle(forming) : null, fractal.pivots);

  const breaks = structure.breaks.map((b) => {
    const src = [...structure.pivots]
      .reverse()
      .find((p) => p.index < b.index && Math.abs(p.price - b.level) < 1e-9);
    return { ...b, fromT: src?.t ?? recent[Math.max(0, b.index - 5)].t };
  });
  const buySide = Array.from(
    new Set(structure.pivots.filter((p) => p.kind === "high" && p.price > price).map((p) => p.price)),
  )
    .sort((a, b) => a - b)
    .slice(0, 4);
  const sellSide = Array.from(
    new Set(structure.pivots.filter((p) => p.kind === "low" && p.price < price).map((p) => p.price)),
  )
    .sort((a, b) => b - a)
    .slice(0, 4);
  return {
    pivots: pivotsLabelled,
    livePivots,
    breaks: breaks.slice(-8),
    fvgs: poi.fair_value_gaps.filter((g) => g.status !== "MITIGATED").slice(-6),
    orderBlocks: poi.order_blocks.filter((z) => z.status !== "MITIGATED").slice(-6),
    buySide,
    sellSide,
    trend: structure.trend,
    windowStart: recent[0].t,
  };
}

export type SmcProjector = {
  x: (tSeconds: number) => number | null;
  y: (p: number) => number | null;
  width: number;
};

export function renderSmcOverlay(
  ctx: CanvasRenderingContext2D,
  smc: SmcOverlay,
  toggles: SmcToggles,
  pr: SmcProjector,
) {
  ctx.save();
  ctx.font = "600 10px 'JetBrains Mono', ui-monospace, monospace";
  const box = (tMs: number, top: number, bottom: number, fill: string, stroke: string, label: string) => {
    const x0 = pr.x(tMs / 1000);
    const y0 = pr.y(top);
    const y1 = pr.y(bottom);
    if (x0 == null || y0 == null || y1 == null) return;
    const x = Math.max(0, x0);
    ctx.fillStyle = fill;
    ctx.fillRect(x, Math.min(y0, y1), pr.width - x, Math.abs(y1 - y0));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, Math.min(y0, y1), pr.width - x, Math.abs(y1 - y0));
    ctx.fillStyle = stroke;
    ctx.fillText(label, x + 4, Math.min(y0, y1) + 11);
  };

  if (toggles.fvg) {
    for (const g of smc.fvgs) {
      const bull = g.type === "BULLISH_FVG";
      box(
        g.t,
        g.top,
        g.bottom,
        bull ? "rgba(8,153,129,0.10)" : "rgba(242,54,69,0.10)",
        bull ? "rgba(8,153,129,0.75)" : "rgba(242,54,69,0.75)",
        `${bull ? "Bull" : "Bear"} FVG${g.status === "PARTIAL" ? " · partial" : ""}`,
      );
    }
    // Live (unconfirmed) swings: outlined dashed badge that follows the forming candle.
    for (const p of smc.livePivots ?? []) {
      const x = pr.x(p.t / 1000);
      const y = pr.y(p.price);
      if (x == null || y == null) continue;
      const up = p.kind === "high";
      const color = p.label === "HH" || p.label === "HL" || p.label === "L" ? "#089981" : "#f23645";
      const text = p.label;
      const w = ctx.measureText(text).width + 8;
      const yy = up ? y - 20 : y + 6;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.roundRect?.(x - w / 2, yy, w, 14, 3);
      if (!ctx.roundRect) ctx.rect(x - w / 2, yy, w, 14);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.fillText(text, x - w / 2 + 4, yy + 10.5);
    }
  }
  if (toggles.orderBlocks) {
    for (const z of smc.orderBlocks) {
      const demand = z.type === "DEMAND";
      box(
        z.t,
        z.top,
        z.bottom,
        demand ? "rgba(41,98,255,0.10)" : "rgba(255,152,0,0.12)",
        demand ? "rgba(41,98,255,0.85)" : "rgba(230,120,0,0.9)",
        `${demand ? "Demand OB" : "Supply OB"}${z.status === "PARTIAL" ? " · partial" : ""}`,
      );
    }
  }
  if (toggles.liquidity) {
    ctx.setLineDash([6, 4]);
    const liq = (price: number, label: string, color: string) => {
      const y = pr.y(price);
      if (y == null) return;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(pr.width * 0.55, y);
      ctx.lineTo(pr.width, y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(`${label} ${price.toFixed(2)}`, pr.width * 0.55 + 4, y - 3);
    };
    smc.buySide.slice(0, 2).forEach((p) => liq(p, "BSL", "#089981"));
    smc.sellSide.slice(0, 2).forEach((p) => liq(p, "SSL", "#f23645"));
    ctx.setLineDash([]);
  }
  if (toggles.breaks) {
    for (const b of smc.breaks) {
      const x0 = pr.x(b.fromT / 1000);
      const x1 = pr.x(b.t / 1000);
      const y = pr.y(b.level);
      if (x0 == null || x1 == null || y == null) continue;
      const color = b.dir === "bullish" ? "#089981" : "#f23645";
      ctx.strokeStyle = color;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      const label = b.type === "CHOCH" ? "CHoCH" : b.type;
      const w = ctx.measureText(label).width;
      ctx.fillText(label, (x0 + x1) / 2 - w / 2, b.dir === "bullish" ? y - 4 : y + 12);
    }
  }
  if (toggles.structure) {
    for (const p of smc.pivots) {
      const x = pr.x(p.t / 1000);
      const y = pr.y(p.price);
      if (x == null || y == null) continue;
      const up = p.kind === "high";
      const color = p.label === "HH" || p.label === "HL" ? "#089981" : "#f23645";
      const w = ctx.measureText(p.label).width + 8;
      const yy = up ? y - 20 : y + 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect?.(x - w / 2, yy, w, 14, 3);
      if (!ctx.roundRect) ctx.rect(x - w / 2, yy, w, 14);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p.label, x - w / 2 + 4, yy + 10.5);
    }
  }
  ctx.restore();
}
