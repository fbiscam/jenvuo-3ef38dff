# Full-chart Mother/Baby strategy fix

## Goal
Make Terminal AI scan the full available closed M30 chart whenever the user asks about the Mother/Son, Mother/Baby, Mother Candle, or Inside Bar strategy, then answer directly with the latest relevant setup.

## Changes
- Replace the last-two-candle-only detector with a backward full-history scan across available closed M30 candles.
- Evaluate candidate patterns newest-first and retain the latest pattern plus its exact status, rather than incorrectly reporting no pattern.
- Keep the strict filters: H4/H1 extreme touch or sweep, London/NY session, M30 ATR, lower inside-bar volume, clean traffic, daily trade limit, and 1.5-pip buffers.
- Return measured direction, entry, SL, 1:3 TP, break-even, opposing swing, and setup age when a valid candidate exists.
- Report an evidence-based setup score/grade from passed deterministic checks; do not claim guaranteed win accuracy.
- Update Terminal AI instructions so direct strategy questions use this verified full-chart result and do not answer from the screenshot's last two candles alone.
- Add regression tests for an older valid pattern followed by unrelated candles, newest-candidate selection, and correct TP/SL calculations.
- Verify analysis tests and the current TypeScript diagnostic; `src/lib/utils.ts` will only be changed if the error reproduces.

## Expected result
When a Mother/Baby pattern exists anywhere in the supplied M30 history, AI identifies the latest relevant formation and explains whether it is currently valid, stale, rejected, or armed with exact measured levels.
