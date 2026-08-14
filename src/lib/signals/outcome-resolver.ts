// Pure, shared outcome resolution for broadcast signals.
//
// One definition of a result, used by the paper-trade resolver, the admin
// accuracy report and the regression tests. No network, no DB, no clock.
//
// Rules (entry-first, candle by candle, WITH desk-style trade management):
//   1. A limit entry must actually be touched before SL/TP can resolve.
//      Never touched inside the evaluation window -> `not_triggered`.
//   2. Once price runs TP1 (default +0.50R) half the position is banked and
//      the stop moves to breakeven (entry). This mirrors how the desk
//      actually manages a ticket, so a trade that runs well into profit can
//      never come back as a full -1R.
//   3. Before TP1: first candle to touch TP or SL decides. If a single candle
//      touches both (ambiguous intrabar ordering) the conservative result
//      wins: `loss`.
//   4. After TP1: touching the breakeven stop -> `win` at +0.25R
//      (0.5 x 0.50R banked, remainder out flat). Touching full TP ->
//      `win` at 0.5 x 0.50R + 0.5 x full reward.
//   5. Entered, TP1 never reached, neither target touched before the window
//      closes -> `expired` (neutral, NOT a win), excluded from win-rate maths.
//      TP1 reached but window closes -> `win` at the banked +0.25R.
//   6. Nothing decided and the window is still open -> `pending`.
//
// The legacy resolver called a trade a "win" at +0.20R of favorable
// excursion, which inflated the public win rate. That shortcut is gone;
// rows resolved under it stay tagged `legacy_partial_0_2r`.

export type Direction = "BUY" | "SELL";

export type Candle = { high: number; low: number; ts?: number };

export type Outcome = "win" | "loss" | "not_triggered" | "expired" | "pending";

/** Tag written to `signal_paper_trades.resolution_method` by this module. */
export const RESOLUTION_METHOD = "managed_tp1_be_v3";
/** Previous full-target-only resolver (no partial / breakeven management). */
export const FULL_TARGET_METHOD = "full_target_v2";
/** Tag carried by rows resolved under the old +0.20R shortcut. */
export const LEGACY_RESOLUTION_METHOD = "legacy_partial_0_2r";

export const EVAL_WINDOW_HOURS = 24;

/** Partial take-profit trigger, in R. Half off here, stop to breakeven. */
export const TP1_R = 0.5;
/** Fraction of the position closed at TP1. */
export const TP1_SIZE = 0.5;


export type ResolveInput = {
  direction: Direction | string;
  entry: number;
  sl: number;
  tp: number;
  /** Chronological candles from signal time onwards. */
  candles: Candle[];
  /** Age of the signal in hours at evaluation time. */
  ageHours: number;
  evalWindowHours?: number;
  /** Absolute price tolerance for "the limit was touched". */
  entryTolerance?: number;
};

export type ResolveResult = {
  outcome: Outcome;
  /** R multiple. `null` while pending. */
  realizedR: number | null;
  entryHit: boolean;
  /** Best favorable excursion seen after entry, in R. */
  maxFavorableR: number;
  reason: string;
  method: string;
};

function invalid(reason: string): ResolveResult {
  return {
    outcome: "pending",
    realizedR: null,
    entryHit: false,
    maxFavorableR: 0,
    reason,
    method: RESOLUTION_METHOD,
  };
}

export function resolveTradeOutcome(input: ResolveInput): ResolveResult {
  const { entry, sl, tp } = input;
  const dir = input.direction === "BUY" ? "BUY" : input.direction === "SELL" ? "SELL" : null;
  if (!dir) return invalid("invalid_direction");
  if (![entry, sl, tp].every((n) => Number.isFinite(n) && n > 0)) {
    return invalid("invalid_levels");
  }

  const isBuy = dir === "BUY";
  const riskDist = Math.abs(entry - sl);
  if (riskDist <= 0) return invalid("zero_risk_distance");
  // SL and TP must sit on the correct side of entry, otherwise the ticket is
  // structurally broken and must never be scored.
  if (isBuy && (sl >= entry || tp <= entry)) return invalid("levels_wrong_side");
  if (!isBuy && (sl <= entry || tp >= entry)) return invalid("levels_wrong_side");

  const windowH = input.evalWindowHours ?? EVAL_WINDOW_HOURS;
  const tol = input.entryTolerance ?? Math.max(riskDist * 0.02, entry * 0.00005);

  let entryHit = false;
  let maxFavorableR = 0;

  for (const c of input.candles) {
    const hi = c.high;
    const lo = c.low;
    if (!Number.isFinite(hi) || !Number.isFinite(lo)) continue;

    if (!entryHit) {
      if (isBuy ? lo <= entry + tol : hi >= entry - tol) entryHit = true;
      else continue;
    }

    const touchedSL = isBuy ? lo <= sl : hi >= sl;
    const touchedTP = isBuy ? hi >= tp : lo <= tp;

    const excR = isBuy ? (hi - entry) / riskDist : (entry - lo) / riskDist;
    if (excR > maxFavorableR) maxFavorableR = excR;

    // Same-candle ambiguity resolves conservatively as a loss.
    if (touchedSL) {
      return {
        outcome: "loss",
        realizedR: -1,
        entryHit: true,
        maxFavorableR,
        reason: touchedTP ? "sl_and_tp_same_candle" : "sl_hit",
        method: RESOLUTION_METHOD,
      };
    }
    if (touchedTP) {
      const rewardR = Math.abs(tp - entry) / riskDist;
      return {
        outcome: "win",
        realizedR: Number(rewardR.toFixed(3)),
        entryHit: true,
        maxFavorableR: Math.max(maxFavorableR, rewardR),
        reason: "tp_hit",
        method: RESOLUTION_METHOD,
      };
    }
  }

  if (input.ageHours < windowH) {
    return {
      outcome: "pending",
      realizedR: null,
      entryHit,
      maxFavorableR,
      reason: entryHit ? "entered_still_open" : "awaiting_entry",
      method: RESOLUTION_METHOD,
    };
  }

  if (!entryHit) {
    return {
      outcome: "not_triggered",
      realizedR: 0,
      entryHit: false,
      maxFavorableR: 0,
      reason: "limit_never_reached",
      method: RESOLUTION_METHOD,
    };
  }

  return {
    outcome: "expired",
    realizedR: Number(Math.max(-1, Math.min(1, maxFavorableR)).toFixed(3)),
    entryHit: true,
    maxFavorableR,
    reason: "window_closed",
    method: RESOLUTION_METHOD,
  };
}

/** Only true TP/SL results count toward win rate. */
export function countsTowardWinRate(outcome: string | null | undefined): boolean {
  return outcome === "win" || outcome === "loss";
}

export type AccuracySummary = {
  total: number;
  wins: number;
  losses: number;
  pending: number;
  expired: number;
  not_triggered: number;
  resolved: number;
  win_rate: number;
  avg_r: number;
  total_r: number;
};

/**
 * Win rate over true TP/SL outcomes only. Pending, expired and
 * never-triggered tickets are reported separately and never inflate it.
 */
export function summarizeAccuracy(
  rows: Array<{ outcome: string | null; realized_r?: number | null }>,
): AccuracySummary {
  let wins = 0;
  let losses = 0;
  let pending = 0;
  let expired = 0;
  let notTriggered = 0;
  let rSum = 0;
  for (const r of rows) {
    switch (r.outcome) {
      case "win":
        wins++;
        rSum += Number(r.realized_r) || 0;
        break;
      case "loss":
        losses++;
        rSum += Number(r.realized_r) || 0;
        break;
      case "expired":
      case "timeout":
        expired++;
        break;
      case "not_triggered":
      case "cancelled":
        notTriggered++;
        break;
      default:
        pending++;
    }
  }
  const resolved = wins + losses;
  return {
    total: rows.length,
    wins,
    losses,
    pending,
    expired,
    not_triggered: notTriggered,
    resolved,
    win_rate: resolved ? Number(((wins / resolved) * 100).toFixed(2)) : 0,
    avg_r: resolved ? Number((rSum / resolved).toFixed(3)) : 0,
    total_r: Number(rSum.toFixed(3)),
  };
}
