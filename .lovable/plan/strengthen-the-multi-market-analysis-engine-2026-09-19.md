# Strengthen the multi-market analysis engine

## Goal
Make extension analysis behave like a disciplined institutional desk: calculate market structure from live candles first, use the shared chart only as confirmation, and return `WAIT` whenever evidence is incomplete or conflicting.

## Changes
- Add deterministic inducement detection around recent internal liquidity, BOS, and CHoCH sequences.
- Add candle-derived support and resistance zones using repeated swing touches; do not let AI invent these levels.
- Add chronological multi-timeframe structure alignment across D1, H4, H1, execution timeframe, and M5.
- Feed these checks into the weighted score and hard-veto rules so weak or contradictory setups cannot become BUY/SELL.
- Expand the engine report with the exact structure, inducement, key-level, FVG/OB, momentum, volume, volatility, and invalidation evidence used.
- Keep the screenshot as corroboration only; visible symbol conflicts or chart contradictions must downgrade to `WAIT`, while backend live candles remain authoritative for prices.
- Preserve normal conversational replies and the existing single-primary-model extension design.

## Verification
- Run a clean TypeScript check and extension JavaScript syntax check.
- Add deterministic scenario checks for bullish, bearish, contradictory, stale, and insufficient-data cases.
- Run a live BTCUSD scan through the same market-data and decision pipeline used by the extension, then report only the current verified BUY, SELL, or WAIT result with its strongest reasons.
- Repackage the extension and verify the stable download contains the new version.

## Safety
No guaranteed accuracy or fabricated “25+ years” claim. The system will emulate a strict veteran review process through explicit evidence and fail-closed rules.
