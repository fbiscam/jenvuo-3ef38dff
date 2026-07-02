## Signal SL/TP/Entry Issues — Diagnosis

I compared the engine code (`src/lib/analysis/engine.ts` → `buildTrade`) with the last real trades logged in your database. Concrete problems:

### 1. Stop-Loss buffer is too tight for Gold
Current formula: `SL buffer = max(0.08% of price, 0.2 × ATR)`.
- On XAU at ~$4000 that's only ~$3.20 beyond the zone.
- Real recent losses had SL just $3.5–$6.6 from entry — stopped by normal noise/wick.
- Gold's typical 15M wick is $4–$12, so tight SL guarantees frequent stop-outs.

### 2. Take-Profit picks the nearest liquidity pool with no distance cap
- Every recent trade has TP = **3944.57** (same static weekly liquidity level ~$50 away), regardless of entry.
- Result: reported R:R of **4.87, 6.65, 8.97, 18.30** — mathematically valid but unrealistic to hit before invalidation.
- Better UX: cap TP at the closer of (nearest opposing pool) vs (fixed R multiple like 1:3–1:5), and split into TP1/TP2/TP3.

### 3. Entry can be right on top of current price
`entry = zone midpoint` but there's no check for "already tagged" or "too close to price."
- The mitigation check (`zoneMitigated`) is computed but not used to force `WAIT` — a chased zone still becomes a live signal.
- No minimum distance-from-price rule → engine can issue a signal where entry = market, giving a tiny buffer before SL.

### 4. No sanity guardrails
- No min risk-distance (e.g., SL must be ≥ 0.25% of price OR ≥ 0.5×ATR).
- No max R:R cap (currently unbounded — misleading confidence).
- No "wait for retracement" mode when price is far from the zone (limit-order handling exists in UI but engine treats midpoint as market).

---

## Proposed Fix

Change `buildTrade` in `src/lib/analysis/engine.ts`:

1. **SL buffer** — widen to `max(0.20% × price, 0.75 × ATR, 0.5 × zone height)`. For XAU that's ≥$8, matching normal wick range.
2. **Discard mitigated zones** — if `zoneMitigated === true` OR zone was tagged in last N candles, return `WAIT` with reason instead of trading it.
3. **Entry sanity** —
   - BUY: require `entry ≤ lastPrice − 0.10% × price` (limit below), or accept market only if inside a fresh unmitigated zone.
   - Same, mirrored, for SELL.
   - If neither holds → return `WAIT` ("chasing price").
4. **TP logic** —
   - Compute `tpLiquidity` (nearest unswept pool) and `tpR3 = entry ± 3R`.
   - Final TP = whichever is **closer** (prevents 1:8+ fantasy trades).
   - Emit **TP1 = 1R**, **TP2 = 2R**, **TP3 = min(tpLiquidity, entry±4R)** so the card shows realistic partials.
5. **R:R clamp** — if computed RR > 5, cap TP to 5R and note "capped at 1:5".
6. **Confidence downgrade** when any of the above fallback rules trigger (subtract 10–15 from score).

## Files to touch

- `src/lib/analysis/engine.ts` — rewrite `buildTrade` per rules above (single function, ~60 lines).
- `src/lib/gold-analysis.functions.ts` — return the new `tp1/tp2/tp3` fields alongside the existing `tp` so nothing else breaks.
- `src/routes/signal.tsx` + `src/components/SignalCard.tsx` — display TP1/TP2/TP3 partials (small UI tweak, optional this pass).

## Not changing
- Scoring/veto system (`scoreSetup`) — still works, just receives better inputs.
- Trade-journal auto-tracking, alerts, or database schema.
- The AI narration layer.

Approve and I'll implement the engine rewrite plus the minimal call-site + card updates.