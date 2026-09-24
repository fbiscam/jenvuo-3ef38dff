/**
 * Jenvu SMC overlays for the chart. Uses exactly the same deterministic
 * engines and the same 400-closed-candle structure window as the Terminal AI evidence,
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
  projection: boolean;
};

export const DEFAULT_SMC: SmcToggles = {
  structure: true,
  breaks: true,
  fvg: false,
  orderBlocks: false,
  liquidity: true,
  projection: true,
};

type Candle = { t: number; o: number; h: number; l: number; c: number };

type PoiSelection = {
  fvgs: FairValueGap[];
  orderBlocks: OrderBlockZone[];
};

const zoneDistance = (top: number, bottom: number, price: number) => {
  if (price >= bottom && price <= top) return 0;
  return Math.min(Math.abs(price - top), Math.abs(price - bottom));
};

/**
 * Keeps only the strongest untouched POI in each direction. This prevents two
 * same-side zones from stacking over each other while retaining the most
 * actionable high-confidence demand, supply and FVG around current price.
 */
export function selectHighConfidencePois(
  poi: Pick<ReturnType<typeof detectPoiEvidence>, "fair_value_gaps" | "order_blocks">,
  price: number,
): PoiSelection {
  const chooseOnePerType = <T extends { type: string; index: number; top: number; bottom: number }>(
    zones: T[],
    score: (zone: T) => number,
  ) => {
    const best = new Map<string, T>();
    for (const zone of zones) {
      const current = best.get(zone.type);
      if (!current || score(zone) > score(current)) best.set(zone.type, zone);
    }
    return [...best.values()].sort((a, b) => a.index - b.index);
  };

  const untouchedFvgs = poi.fair_value_gaps.filter((gap) => gap.status === "UNMITIGATED");
  const averageFvgSize =
    untouchedFvgs.reduce((total, gap) => total + gap.size, 0) / Math.max(1, untouchedFvgs.length);
  const meaningfulFvgs = untouchedFvgs.filter((gap) => gap.size >= averageFvgSize);
  const fvgs = chooseOnePerType(
    meaningfulFvgs,
    (gap) =>
      (gap.size / Math.max(averageFvgSize, Number.EPSILON)) * 100 +
      gap.index +
      500 / (1 + zoneDistance(gap.top, gap.bottom, price)),
  );

  // Untouched OBs; confluence (sweep / FVG / displacement) boosts score so the
  // strongest zone per side wins, but a valid zone is never hidden entirely.
  const activeOrderBlocks = poi.order_blocks.filter((zone) => zone.status !== "MITIGATED");
  const orderBlocks = chooseOnePerType(
    activeOrderBlocks,
    (zone) =>
      (zone.displacement ? 400 : 0) +
      (zone.swept_liquidity ? 300 : 0) +
      (zone.is_fvg_aligned ? 300 : 0) +
      (zone.status === "UNMITIGATED" ? 200 : 0) +
      zone.index +
      500 / (1 + zoneDistance(zone.top, zone.bottom, price)),
  );

  return { fvgs, orderBlocks };
}

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
    // Pick the most extreme candle in the unconfirmed tail (latest wins ties),
    // so the newest low/high — including the forming candle — always gets its label.
    let best = -1;
    for (let i = firstUnconfirmed; i < all.length; i++) {
      if (best < 0 || !beats(val(all[best]), val(all[i]))) best = i;
    }
    for (let i = best; i >= 0 && i === best; i--) {
      const v = val(all[i]);
      let ok = true;
      for (let k = Math.max(0, i - radius); k < i && ok; k++) if (beats(val(all[k]), v)) ok = false;
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
  const poi = detectPoiEvidence(recent);
  const price = currentPrice ?? recent[recent.length - 1].c;

  // HH/HL/LH/LL labels: 10-bar fractal swings (like the Fractals indicator).
  const fractalBars = bars.slice(-FRACTAL_WINDOW).map(toCandle);
  const fractal = detectMarketStructureEvidence(fractalBars, FRACTAL_RADIUS);
  const pivotsLabelled = fractal.pivots.filter((p) => p.label.length === 2);
  const livePivots = computeLivePivots(fractalBars, forming ? toCandle(forming) : null, fractal.pivots);
  const selectedPois = selectHighConfidencePois(poi, price);

  // Structure labels, breaks, trend and liquidity must all come from this same
  // confirmed 10-bar pivot set. Provisional tail pivots never create events.
  const breaks = fractal.breaks.map((b) => {
    const src = [...fractal.pivots]
      .reverse()
      .find((p) => p.index < b.index && Math.abs(p.price - b.level) < 1e-9);
    return { ...b, fromT: src?.t ?? fractalBars[Math.max(0, b.index - FRACTAL_RADIUS)].t };
  });
  const buySide = Array.from(
    new Set(fractal.pivots.filter((p) => p.kind === "high" && p.price > price).map((p) => p.price)),
  )
    .sort((a, b) => a - b)
    .slice(0, 4);
  const sellSide = Array.from(
    new Set(fractal.pivots.filter((p) => p.kind === "low" && p.price < price).map((p) => p.price)),
  )
    .sort((a, b) => b - a)
    .slice(0, 4);
  return {
    pivots: pivotsLabelled,
    livePivots,
    breaks: breaks.slice(-8),
    fvgs: selectedPois.fvgs,
    orderBlocks: selectedPois.orderBlocks,
    buySide,
    sellSide,
    trend: fractal.trend,
    windowStart: fractalBars[0].t,
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
  const dottedLine = (tMs: number, price: number, color: string) => {
    const x0 = pr.x(tMs / 1000);
    const y = pr.y(price);
    if (x0 == null || y == null) return;
    const x = Math.max(0, x0);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(pr.width, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const orderBlock = (ob: OrderBlockZone) => {
    const x0 = pr.x(ob.t / 1000);
    const topY = pr.y(ob.top);
    const bottomY = pr.y(ob.bottom);
    if (x0 == null || topY == null || bottomY == null) return;

    const supply = ob.type === "SUPPLY";
    const x = Math.max(0, x0);
    const width = Math.max(1, pr.width - x);
    const y = Math.min(topY, bottomY);
    const height = Math.max(2, Math.abs(bottomY - topY));
    const edge = supply ? "rgb(239,68,68)" : "rgb(16,185,129)";
    const fill = supply ? "rgba(239,68,68,0.11)" : "rgba(16,185,129,0.11)";
    const label = supply ? "SUPPLY ZONE" : "DEMAND ZONE";

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(pr.width, y);
    ctx.moveTo(x, y + height);
    ctx.lineTo(pr.width, y + height);
    ctx.stroke();

    const textWidth = ctx.measureText(label).width;
    const labelX = Math.min(pr.width - textWidth - 12, Math.max(x + 8, x + width / 2 - textWidth / 2));
    const labelY = y + height / 2;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.roundRect?.(labelX - 5, labelY - 8, textWidth + 10, 16, 3);
    if (!ctx.roundRect) ctx.rect(labelX - 5, labelY - 8, textWidth + 10, 16);
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY + 0.5);
    ctx.textBaseline = "alphabetic";
  };

  const fairValueGap = (gap: FairValueGap) => {
    const x0 = pr.x(gap.t / 1000);
    const topY = pr.y(gap.top);
    const bottomY = pr.y(gap.bottom);
    if (x0 == null || topY == null || bottomY == null) return;

    const x = Math.max(0, x0);
    const width = Math.max(1, pr.width - x);
    const y = Math.min(topY, bottomY);
    const height = Math.max(2, Math.abs(bottomY - topY));
    const edge = "rgb(34,197,94)";
    const label = gap.type === "BULLISH_FVG" ? "BULLISH FVG" : "BEARISH FVG";

    ctx.fillStyle = "rgba(34,197,94,0.1)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(pr.width, y);
    ctx.moveTo(x, y + height);
    ctx.lineTo(pr.width, y + height);
    ctx.stroke();

    const textWidth = ctx.measureText(label).width;
    const labelX = Math.min(pr.width - textWidth - 12, Math.max(x + 8, x + width / 2 - textWidth / 2));
    const labelY = y + height / 2;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.roundRect?.(labelX - 5, labelY - 8, textWidth + 10, 16, 3);
    if (!ctx.roundRect) ctx.rect(labelX - 5, labelY - 8, textWidth + 10, 16);
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY + 0.5);
    ctx.textBaseline = "alphabetic";
  };

  if (toggles.fvg) {
    for (const gap of smc.fvgs) fairValueGap(gap);
  }
  if (toggles.orderBlocks) {
    for (const ob of smc.orderBlocks) orderBlock(ob);
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
    smc.buySide.slice(0, 1).forEach((p) => liq(p, "BSL", "#089981"));
    smc.sellSide.slice(0, 1).forEach((p) => liq(p, "SSL", "#f23645"));
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
  ctx.restore();
}
