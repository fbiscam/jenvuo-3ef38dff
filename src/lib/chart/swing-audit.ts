/**
 * Multi-asset swing audit: grades every fresh HH/HL/LH/LL from closed candles only.
 * Pure — the scheduled job feeds candles and stores the result.
 * - repainted: a later candle wicked beyond the swing before it locked (label moved).
 * - locked: FRACTAL_RADIUS closed candles held inside the swing.
 * - trade: entry = Candle 1 close, SL = swing extreme, TP = 2R; tp/sl/open.
 * - reachedNextSwing: price reached the previous opposite swing before breaking the swing.
 */
import { FRACTAL_RADIUS } from "@/lib/chart/smc-overlay";
import type { OhlcvBar } from "@/lib/chart/indicators";

export const AUDIT_RR = 2;
export const AUDIT_ASSETS = ["EURUSD", "XAUUSD", "BTCUSD"] as const;
export const AUDIT_TIMEFRAMES = ["15m", "1h"] as const;
export type AuditOutcome = "tp" | "sl" | "open";

export type SwingAudit = {
  repainted: boolean;
  locked: boolean;
  entry: number | null;
  stop: number;
  target: number | null;
  outcome: AuditOutcome;
  reachedNextSwing: boolean | null;
  mfePips: number;
  maePips: number;
  barsTracked: number;
};

export function pipSize(asset: string) {
  return asset === "EURUSD" ? 0.0001 : asset === "XAUUSD" ? 0.1 : 1;
}

/** i = swing candle index in `bars`; opposite = previous opposite swing price (target level) or null. */
export function auditSwing(bars: OhlcvBar[], i: number, kind: "high" | "low", price: number, opposite: number | null, pip: number): SwingAudit {
  const after = bars.slice(i + 1);
  const breaks = (b: OhlcvBar) => (kind === "high" ? b.high > price : b.low < price);
  const lockWindow = after.slice(0, FRACTAL_RADIUS);
  const repainted = lockWindow.some(breaks);
  const locked = !repainted && lockWindow.length >= FRACTAL_RADIUS;
  const c1 = after[0];
  const entry = c1 ? c1.close : null;
  const risk = entry == null ? 0 : Math.abs(price - entry);
  const target = entry == null || risk <= 0 ? null : kind === "high" ? entry - risk * AUDIT_RR : entry + risk * AUDIT_RR;
  let outcome: AuditOutcome = "open";
  let reached: boolean | null = opposite == null ? null : false;
  let mfe = 0, mae = 0;
  for (const b of after.slice(1)) {
    if (entry != null) {
      const fav = kind === "high" ? entry - b.low : b.high - entry;
      const adv = kind === "high" ? b.high - entry : entry - b.low;
      if (outcome === "open") { mfe = Math.max(mfe, fav); mae = Math.max(mae, adv); }
    }
    const hitSl = breaks(b);
    const hitTp = target != null && (kind === "high" ? b.low <= target : b.high >= target);
    if (outcome === "open" && target != null) {
      // Same candle hits both: count the loss (no intrabar order is known).
      if (hitSl) outcome = "sl"; else if (hitTp) outcome = "tp";
    }
    if (reached === false && opposite != null && (kind === "high" ? b.low <= opposite : b.high >= opposite)) reached = true;
    if (hitSl && reached === false) break;
    if (outcome !== "open" && reached !== false) break;
  }
  return {
    repainted, locked, entry, stop: price, target, outcome, reachedNextSwing: reached,
    mfePips: Math.round((mfe / pip) * 10) / 10, maePips: Math.round((mae / pip) * 10) / 10,
    barsTracked: after.length,
  };
}
