/**
 * Fresh-swing email alerts: picks newly confirmed HH/HL/LH/LL swings whose
 * price action and/or fresh-swing sweep passes the chart's high-probability
 * filter. Pure: the scheduled job feeds closed candles, this decides what fires.
 */
import { computeSmcOverlay, FRACTAL_RADIUS, FRACTAL_WINDOW } from "@/lib/chart/smc-overlay";
import { PA_MIN_REVERSAL_SHARE } from "@/lib/chart/high-probability";
import type { SwingPriceAction } from "@/lib/chart/swing-price-action";
import type { SwingSweep } from "@/lib/chart/swing-sweep";

/**
 * Email-speed price action: a reversal pattern printed with clear reversal-side
 * control and no close back beyond the extreme. Unlike the chart tag it does not
 * wait for every reaction candle, so the email goes out on the candle that proves it.
 */
export function alertPriceActionOk(pa: SwingPriceAction | undefined | null): boolean {
  return !!pa && pa.reacted && pa.pattern !== "indecision" && pa.pattern !== "pending" && pa.control !== "balanced" && (pa.reversalShare ?? 0) >= PA_MIN_REVERSAL_SHARE && (pa.held === true || pa.pattern === "pin");
}
/** Email-speed sweep: liquidity taken, closed back inside and a displacement close (confirmed or late), not failed. */
export function alertSweepOk(sw: SwingSweep | undefined | null): boolean {
  return !!sw && (sw.status === "confirmed" || sw.status === "late");
}
import type { OhlcvBar } from "@/lib/chart/indicators";

export const ALERT_ASSETS = ["XAUUSD", "EURUSD", "BTCUSD"] as const;
export const ALERT_TIMEFRAMES = ["1h"] as const;
/** A swing counts as fresh only if it confirmed on one of the newest N closed candles. */
export const FRESH_CONFIRM_BARS = 3;
/** Alerts use the chart's own swing confirmation, so an email only goes out once the label is drawn on the chart. */
export const ALERT_FRACTAL_RADIUS = FRACTAL_RADIUS;

export type StructureAlert = {
  key: string;
  asset: string;
  timeframe: string;
  label: string;
  kind: "high" | "low";
  price: number;
  swingTime: number;
  confirmedTime: number;
  priceAction: string | null;
  sweep: string | null;
  /** Previous same-side swing the label is measured against (HH/LH vs previous high, HL/LL vs previous low). */
  prevPrice: number | null;
};

export function detectStructureAlerts(asset: string, timeframe: string, closed: OhlcvBar[]): StructureAlert[] {
  if (closed.length < 30) return [];
  const smc = computeSmcOverlay(closed, closed[closed.length - 1]!.close, null, { useVolume: asset === "BTCUSD", fractalRadius: ALERT_FRACTAL_RADIUS });
  const fractal = closed.slice(-FRACTAL_WINDOW);
  const out: StructureAlert[] = [];
  for (const p of smc.pivots) {
    if (!["HH", "HL", "LH", "LL"].includes(p.label)) continue;
    if (p.confirmedIndex < fractal.length - FRESH_CONFIRM_BARS) continue;
    const pa = smc.priceAction?.[p.t];
    const sw = smc.swingSweeps?.[p.t];
    const paOk = alertPriceActionOk(pa);
    const swOk = alertSweepOk(sw);
    if (!paOk && !swOk) continue;
    const conf = fractal[Math.min(p.confirmedIndex, fractal.length - 1)]!;
    pushAlert(p.kind, p.label, p.price, p.t, conf.time * 1000, pa, sw, paOk, swOk);
  }
  // Candle-1 swings shown on the chart before they lock: email as soon as the
  // reversal candle has closed and price action or sweep qualifies (dedupe key
  // matches the later locked pivot, so one email per swing).
  for (const p of smc.livePivots) {
    if (!["HH", "HL", "LH", "LL"].includes(p.label) || p.barsAfter > 6) continue;
    if (out.some((a) => a.swingTime === p.t && a.kind === p.kind)) continue;
    const pa = smc.priceAction?.[p.t];
    const sw = smc.swingSweeps?.[p.t];
    const paOk = alertPriceActionOk(pa);
    const swOk = alertSweepOk(sw);
    if (!paOk && !swOk) continue;
    const idx = fractal.findIndex((b) => b.time * 1000 === p.t);
    const conf = fractal[Math.min(idx + 1, fractal.length - 1)]!;
    pushAlert(p.kind, p.label, p.price, p.t, conf.time * 1000, pa, sw, paOk, swOk);
  }
  return out;

  function prevOf(kind: "high" | "low", t: number): number | null {
    const prev = smc.pivots.filter((q) => q.kind === kind && q.t < t).pop();
    return prev ? prev.price : null;
  }
  function labelFor(kind: "high" | "low", price: number, t: number, fallback: string): string {
    const prev = prevOf(kind, t);
    if (prev == null) return fallback;
    return kind === "high" ? (price > prev ? "HH" : "LH") : (price < prev ? "LL" : "HL");
  }
  function pushAlert(kind: "high" | "low", label: string, price: number, t: number, confirmedTime: number, pa: NonNullable<typeof smc.priceAction>[number] | undefined, sw: NonNullable<typeof smc.swingSweeps>[number] | undefined, paOk: boolean, swOk: boolean) {
    out.push({
      key: `${asset}:${timeframe}:${kind}:${t}`,
      asset,
      timeframe,
      label: labelFor(kind, price, t, label),
      kind,
      price,
      prevPrice: prevOf(kind, t),
      swingTime: t,
      confirmedTime,
      priceAction: paOk && pa ? `${pa.text}${pa.reversalShare != null ? ` (${pa.control} ${Math.round(pa.reversalShare)}%)` : ""}` : null,
      sweep: swOk && sw ? sw.text : null,
    });
  }
}

export const ALERT_PLANS = ["pro", "elite", "ultra"] as const;
type SubRow = { plan_id: string | null; status: string | null; is_trial?: boolean | null; current_period_end?: string | null };
/** Only an active, non-trial, unexpired Pro/Elite/Ultra plan receives fresh high/low emails. */
export function receivesStructureAlerts(sub: SubRow | null, now = Date.now()): boolean {
  if (!sub || sub.status !== "active" || sub.is_trial) return false;
  if (!(ALERT_PLANS as readonly string[]).includes(String(sub.plan_id ?? "").toLowerCase())) return false;
  if (sub.current_period_end && new Date(sub.current_period_end).getTime() <= now) return false;
  return true;
}
