# Signal System Accuracy and Reliability Fix

## Confirmed audit findings

- This week has **10 recorded signals: 9 wins and 1 loss**, so the current public figure is **90% win rate**. By pair: XAUJPY 4/4, XAUCHF 1/1, XAUGBP 2/2, XAUAUD 1/1, and XAUUSD 1/2.
- That 90% figure is not a reliable full-target win rate: the outcome resolver currently calls a trade a win at only **+0.20R**, and 8 of the 9 wins were recorded at exactly +0.20R. The public page then labels this as “Win +20%,” although +0.20R is not the same as 20% account profit.
- Auto-scan is enabled and configured for all six XAU pairs at a 70% minimum, but its last diagnostic heartbeat was about **6 hours 40 minutes ago** even though the weekday schedule should still have been active.
- Manual scans show “sent” before the background broadcast has actually succeeded. The broadcast worker also recomputes the plan, so the alerted trade can differ from the plan the user just saw.
- The signal page and auto-scan share similar gates, but those rules are duplicated, making threshold, HTF-alignment, grading, and session behavior prone to drifting apart.
- Current weekly alerts were recorded as using only the deterministic ICT/SMC engine; AI participation is not consistently represented in signal history.
- Alert email delivery is unhealthy this week: 122 messages are in dead-letter status, 145 remain pending, and only 2 are marked sent.
- There are no focused regression tests covering scan qualification, entry triggering, outcome resolution, or public accuracy calculations.

## Implementation plan

### 1. Make performance reporting honest

- Replace the +0.20R “win” shortcut with candle-by-candle entry-first resolution against the actual configured TP and SL.
- Preserve `Not Triggered` when the limit entry is never reached, and keep unresolved entered trades open until TP, SL, or the evaluation window closes.
- Give timed-out entered trades a neutral/expired status rather than counting them as wins.
- Update the public feed and admin accuracy report so win rate uses only true TP/SL outcomes and labels R-multiples correctly.
- Do not rewrite historical outcomes silently. Clearly separate the old +0.20R methodology from newly resolved full-target results, or backfill only where complete candle history permits deterministic recalculation.

### 2. Repair and harden auto-scan execution

- Inspect scheduler run history through the existing admin diagnostic path and identify why heartbeats stopped.
- Restore the five-minute weekday job using the secured canonical auto-scan route.
- Add explicit run records for start, completion, duration, checked pairs, skip reason, and failure so a stopped or timed-out scanner is immediately visible.
- Keep bounded pair batches, but ensure all six pairs rotate deterministically and no pair can be starved after retries or timeouts.

### 3. Unify signal qualification

- Extract one shared qualification module for minimum confidence, HTF alignment, news pause, duplicate protection, freshness, grading, and valid entry/SL/TP checks.
- Use that same module for both manual scans and scheduled scans.
- Keep the current 70% minimum and 24/7 scanning behavior unless real outcome data supports a stricter rule; do not optimize thresholds from only ten trades.
- Ensure stale or scale-invalid XAU cross prices fail closed instead of producing a trade.

### 4. Make manual broadcasts authoritative

- Stop marking a manual result as broadcast until the server confirms the alert row and recipient fan-out.
- Use the exact qualified plan shown to the user, with a stable scan ID/fingerprint, instead of independently recomputing a potentially different plan.
- Return and display a precise result: broadcast, blocked with gate reason, duplicate, or delivery failure.
- Preserve idempotency so retries cannot duplicate alerts or charges.

### 5. Stabilize AI analysis and model audit data

- Keep deterministic ICT/SMC structure as the base, then run AI as a documented review/enrichment stage with bounded timeouts and fallback.
- Record only models that actually completed work; never list an attempted fallback chain as if every model participated.
- Persist review verdict, confidence adjustment, and model usage on the alert and paper-trade record so history matches the real scan.
- Ensure failed AI enrichment does not fabricate analysis or change the deterministic setup invisibly.

### 6. Repair alert delivery

- Trace the pending/dead-letter email queue and correct the failing dispatch/retry path for signal alerts.
- Keep per-recipient idempotency keys and update send-log status atomically so retries neither duplicate nor remain permanently pending.
- Verify in-app, Telegram, and email delivery independently; one channel failing must not roll back the signal record.

### 7. Add regression coverage and verify end to end

- Add tests for entry-before-TP/SL ordering, never-triggered limits, same-candle ambiguity, TP wins, SL losses, expiry, cross-pair price scale, qualification parity, and broadcast idempotency.
- Run an authenticated manual scan and verify the displayed plan exactly matches the stored alert.
- Verify scheduler heartbeats resume, all six pairs rotate, delivery logs advance, and the public feed reports the corrected outcome methodology.
- Recalculate and provide the final weekly signal list and accuracy after the resolver correction, clearly distinguishing true wins, losses, pending/expired, and not-triggered trades.

## Technical structure

- Move runtime analysis helpers out of the large server-function module into server-only helper modules, leaving server-function files as thin RPC wrappers.
- Introduce shared pure modules for qualification and outcome resolution so both runtime code and tests execute the same rules.
- Apply backend schema changes through a migration only if additional run/outcome metadata is required; preserve existing RLS and grants.