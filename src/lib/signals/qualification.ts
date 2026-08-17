// Single source of truth for "is this setup allowed to become an alert?".
//
// Both the manual scan path and the scheduled auto-scan run these exact
// rules, so thresholds, HTF alignment, grading, level validity and price
// freshness can no longer drift apart between the two surfaces.
//
// Pure module: no network, no DB, no clock reads (the caller passes `now`).

export type Direction = "BUY" | "SELL";

/** Global quality floor. Runtime config may raise it, never lower it. */
export const MIN_CONFIDENCE = 70;
/** Broadcast tickets must carry at least a 2R target. */
export const MIN_RR = 2;
/** A live tick older than this must not be used for gating decisions. */
export const MAX_TICK_AGE_MS = 5 * 60_000;

/** Plausible quote ranges — a cross priced outside these is a scale bug. */
export const PAIR_PRICE_RANGE: Record<string, [number, number]> = {
  XAUUSD: [500, 20_000],
  XAUEUR: [500, 20_000],
  XAUGBP: [400, 20_000],
  XAUAUD: [700, 30_000],
  XAUCHF: [400, 20_000],
  XAUJPY: [100_000, 2_000_000],
};

export function isPriceScaleValid(pair: string, price: number): boolean {
  const range = PAIR_PRICE_RANGE[pair.toUpperCase()];
  if (!Number.isFinite(price) || price <= 0) return false;
  // Unknown pair: only reject non-finite/negative, do not guess a range.
  if (!range) return true;
  return price >= range[0] && price <= range[1];
}

export function gradeFor(confidence: number): "A+" | "A" | "B" | "C" {
  const c = Math.round(confidence);
  if (c >= 88) return "A+";
  if (c >= 70) return "A";
  if (c >= 65) return "B";
  return "C";
}

export function sessionFor(utcHour: number): string {
  if (utcHour < 7) return "Asia";
  if (utcHour < 12) return "London";
  if (utcHour < 16) return "London/NY Overlap";
  if (utcHour < 21) return "New York";
  return "After Hours";
}

/** Gold trades Sunday 22:00 UTC → Friday 21:00 UTC. */
export function isMarketClosed(now: Date): boolean {
  const dow = now.getUTCDay();
  const h = now.getUTCHours();
  return dow === 6 || (dow === 5 && h >= 21) || (dow === 0 && h < 22);
}

export type QualifyInput = {
  pair: string;
  direction?: string | null;
  confidence: number;
  entry: number;
  sl: number;
  /** Preferred target first; the first finite value is used. */
  tpCandidates: Array<number | null | undefined>;
  htfBias?: string | null;
  /** UTC hour of the scan, used for the session-relaxed HTF gate. */
  utcHour: number;
  minConf?: number;
  minRR?: number;
};

export type QualifyReject = { ok: false; reason: string; detail?: Record<string, unknown> };
export type QualifyPass = {
  ok: true;
  direction: Direction;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  riskDist: number;
  confidence: number;
  grade: "A+" | "A" | "B" | "C";
  session: string;
  /** True when TP was stretched up to the 2R floor. */
  tpAdjusted: boolean;
};
export type QualifyResult = QualifyPass | QualifyReject;

export function qualifySignal(input: QualifyInput): QualifyResult {
  const pair = String(input.pair ?? "").toUpperCase();
  const dir = input.direction === "BUY" ? "BUY" : input.direction === "SELL" ? "SELL" : null;
  if (!dir) return { ok: false, reason: "no_direction" };

  const minConf = Math.max(MIN_CONFIDENCE, Number(input.minConf ?? MIN_CONFIDENCE) || MIN_CONFIDENCE);
  const conf = Number(input.confidence);
  if (!Number.isFinite(conf)) return { ok: false, reason: "no_confidence" };
  if (conf < minConf) return { ok: false, reason: "below_threshold", detail: { conf, minConf } };

  // HTF bias alignment. Neutral bias passes during London + NY (7–20 UTC),
  // and a ≥80% conviction setup may trade against bias (reversal signals).
  const htfBias = String(input.htfBias ?? "neutral");
  const activeSession = input.utcHour >= 7 && input.utcHour < 20;
  const aligned =
    (dir === "BUY" && htfBias === "bullish") ||
    (dir === "SELL" && htfBias === "bearish") ||
    (activeSession && htfBias === "neutral") ||
    conf >= 80;
  if (!aligned) {
    return { ok: false, reason: "htf_bias_conflict", detail: { htfBias, dir, conf } };
  }

  const entry = Number(input.entry);
  const sl = Number(input.sl);
  const tpRaw = input.tpCandidates.map(Number).find((n) => Number.isFinite(n) && n > 0);
  if (!Number.isFinite(entry) || !Number.isFinite(sl) || tpRaw === undefined) {
    return { ok: false, reason: "invalid_levels" };
  }
  // Fail closed on scale-invalid cross prices instead of shipping a trade.
  if (!isPriceScaleValid(pair, entry) || !isPriceScaleValid(pair, sl) || !isPriceScaleValid(pair, tpRaw)) {
    return { ok: false, reason: "price_scale_invalid", detail: { pair, entry, sl, tp: tpRaw } };
  }

  const riskDist = Math.abs(entry - sl);
  if (riskDist <= 0) return { ok: false, reason: "zero_risk_distance" };
  if (dir === "BUY" && sl >= entry) return { ok: false, reason: "levels_wrong_side" };
  if (dir === "SELL" && sl <= entry) return { ok: false, reason: "levels_wrong_side" };

  const minRR = Number(input.minRR ?? MIN_RR) || MIN_RR;
  let tp = tpRaw;
  let tpAdjusted = false;
  const onCorrectSide = dir === "BUY" ? tp > entry : tp < entry;
  if (!onCorrectSide || Math.abs(tp - entry) < riskDist * minRR) {
    tp = dir === "BUY" ? entry + riskDist * minRR : entry - riskDist * minRR;
    tpAdjusted = true;
  }
  const rr = Math.abs(tp - entry) / riskDist;

  return {
    ok: true,
    direction: dir,
    entry,
    sl,
    tp,
    rr,
    riskDist,
    confidence: conf,
    grade: gradeFor(conf),
    session: sessionFor(input.utcHour),
    tpAdjusted,
  };
}

export type FreshnessInput = {
  direction: Direction;
  entry: number;
  sl: number;
  tp: number;
  livePrice: number | null | undefined;
  /** Epoch ms of the live tick, when the feed provides one. */
  tickTs?: number | null;
  nowMs: number;
  maxTickAgeMs?: number;
};

export type FreshnessResult = { ok: boolean; reason: string; detail?: Record<string, unknown> };

/**
 * Refuse to broadcast on a stale or already-consumed price.
 * Fails CLOSED: a missing or aged tick blocks the alert rather than
 * shipping levels the market has already left behind.
 */
export function checkFreshness(input: FreshnessInput): FreshnessResult {
  const lp = Number(input.livePrice);
  if (!Number.isFinite(lp) || lp <= 0) {
    return { ok: false, reason: "no_live_price" };
  }
  const maxAge = input.maxTickAgeMs ?? MAX_TICK_AGE_MS;
  if (input.tickTs != null && Number.isFinite(input.tickTs)) {
    const age = input.nowMs - Number(input.tickTs);
    if (age > maxAge) {
      return { ok: false, reason: "stale_tick", detail: { age_ms: age } };
    }
  }
  const isBuy = input.direction === "BUY";
  const riskDist = Math.abs(input.entry - input.sl);
  const rewardDist = Math.abs(input.tp - input.entry);
  if (riskDist <= 0) return { ok: false, reason: "zero_risk_distance" };

  const towardSL = isBuy ? input.entry - lp : lp - input.entry;
  const towardTP = isBuy ? lp - input.entry : input.entry - lp;
  if (towardSL > 0.4 * riskDist) {
    return { ok: false, reason: "drifted_toward_sl", detail: { entry: input.entry, live: lp } };
  }
  if (rewardDist > 0 && towardTP > 0.6 * rewardDist) {
    return { ok: false, reason: "already_past_tp", detail: { entry: input.entry, live: lp } };
  }
  return { ok: true, reason: "fresh" };
}
