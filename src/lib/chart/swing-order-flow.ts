/**
 * Swing order-flow delta (1H / 2H / 4H tool). Closed candles only, no volume
 * (gold volume differs per feed). Each candle's buying = close - low and
 * selling = high - close; summed over the swing candle and the next
 * FLOW_BARS closed candles. Delta = (buy - sell) / total range, -100..+100.
 * Pending until those candles close, then never changes. Display only.
 */
type Bar = { t: number; o: number; h: number; l: number; c: number };

export type SwingOrderFlow = { delta: number | null; side: "buyers" | "sellers" | "balanced" | "pending"; text: string };

export const FLOW_BARS = 3;
export const FLOW_CUT = 10;

export function classifySwingOrderFlow(closed: Bar[], i: number): SwingOrderFlow {
  if (i < 0 || i >= closed.length) return { delta: null, side: "pending", text: "Δ waiting" };
  if (i + FLOW_BARS >= closed.length) return { delta: null, side: "pending", text: "Δ waiting" };
  let buy = 0;
  let sell = 0;
  for (let k = i; k <= i + FLOW_BARS; k++) {
    const b = closed[k];
    buy += Math.max(0, b.c - b.l);
    sell += Math.max(0, b.h - b.c);
  }
  const total = buy + sell;
  const delta = total > 0 ? Math.round(((buy - sell) / total) * 100) : 0;
  const side = delta >= FLOW_CUT ? "buyers" : delta <= -FLOW_CUT ? "sellers" : "balanced";
  const sign = delta > 0 ? "+" : "";
  const name = side === "buyers" ? "Buyers" : side === "sellers" ? "Sellers" : "Balanced";
  return { delta, side, text: `Δ ${sign}${delta}% ${name}` };
}
