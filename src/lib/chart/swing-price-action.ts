/**
 * Swing price action: for every fresh high/low, did price react with a real
 * price-action pattern, and who is in control (buyers / sellers)?
 * Closed candles only, so the verdict is identical in every browser and
 * never changes once the reaction candles have closed.
 */

type Bar = { t: number; o: number; h: number; l: number; c: number };

export type SwingPattern = "pin" | "engulfing" | "displacement" | "indecision" | "none" | "pending";
export type SwingControl = "buyers" | "sellers" | "balanced";

export type SwingPriceAction = {
  pattern: SwingPattern;
  /** True when a reversal pattern printed AND the reversal side controls the swing. */
  reacted: boolean;
  control: SwingControl;
  text: string;
};

const PATTERN_TEXT: Record<SwingPattern, string> = {
  pin: "Pin rejection",
  engulfing: "Engulfing",
  displacement: "Strong reversal",
  indecision: "Indecision",
  none: "No price action",
  pending: "Waiting for close",
};

/** Number of closed candles after the swing inspected for a reaction. */
export const PA_REACTION_BARS = 3;

function atrBefore(bars: Bar[], i: number, period = 14): number {
  let sum = 0;
  let n = 0;
  for (let k = Math.max(1, i - period + 1); k <= i; k++) {
    const b = bars[k];
    const pc = bars[k - 1].c;
    sum += Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
    n++;
  }
  return n ? sum / n : Math.max(0, bars[i].h - bars[i].l);
}

function closeShare(bars: Bar[], from: number, to: number): number | null {
  let buy = 0;
  let total = 0;
  for (let k = from; k <= to; k++) {
    const b = bars[k];
    const r = b.h - b.l;
    if (!(r > 0)) continue;
    buy += b.c - b.l;
    total += r;
  }
  return total > 0 ? (buy / total) * 100 : null;
}

/**
 * Classify the price action at swing index `i` of `closed`.
 * `buyerPct` is the swing's buyer pressure (0-100) when available.
 */
export function classifySwingPriceAction(
  closed: Bar[],
  i: number,
  kind: "high" | "low",
  buyerPct?: number | null,
): SwingPriceAction {
  const high = kind === "high";
  if (i < 0 || i >= closed.length) {
    return { pattern: "pending", reacted: false, control: "balanced", text: PATTERN_TEXT.pending };
  }
  const s = closed[i];
  const after = Math.min(closed.length - 1, i + PA_REACTION_BARS);
  const atr = atrBefore(closed, i);

  const share = buyerPct ?? (after > i ? closeShare(closed, i, after) : closeShare(closed, i, i));
  const control: SwingControl = share == null ? "balanced" : share >= 55 ? "buyers" : share <= 45 ? "sellers" : "balanced";
  const reversalControl = high ? control === "sellers" : control === "buyers";

  const range = s.h - s.l;
  const body = Math.abs(s.c - s.o);
  const upper = s.h - Math.max(s.o, s.c);
  const lower = Math.min(s.o, s.c) - s.l;
  const rejectWick = high ? upper : lower;

  let pattern: SwingPattern = "none";
  if (range > 0 && rejectWick >= 2 * body && rejectWick >= 0.5 * range) pattern = "pin";

  if (pattern === "none" && i + 1 <= after) {
    const n = closed[i + 1];
    const nBody = Math.abs(n.c - n.o);
    const engulf = high
      ? n.c < n.o && n.c < Math.min(s.o, s.c) && n.o >= Math.max(s.o, s.c) - 0.1 * atr && nBody >= body
      : n.c > n.o && n.c > Math.max(s.o, s.c) && n.o <= Math.min(s.o, s.c) + 0.1 * atr && nBody >= body;
    if (engulf) pattern = "engulfing";
  }

  if (pattern === "none") {
    for (let k = i + 1; k <= after; k++) {
      const c = closed[k];
      if (high ? c.c < s.l - 0.3 * atr : c.c > s.h + 0.3 * atr) { pattern = "displacement"; break; }
    }
  }

  if (pattern === "none" && range > 0 && body <= 0.1 * range) pattern = "indecision";
  if (pattern === "none" && after === i) pattern = "pending";

  const strong = pattern === "pin" || pattern === "engulfing" || pattern === "displacement";
  const reacted = strong && reversalControl;
  const who = control === "buyers" ? "Buyers" : control === "sellers" ? "Sellers" : "Balanced";
  const mark = reacted ? "✓ " : strong ? "~ " : "";
  return { pattern, reacted, control, text: `${mark}${PATTERN_TEXT[pattern]} · ${who}` };
}
