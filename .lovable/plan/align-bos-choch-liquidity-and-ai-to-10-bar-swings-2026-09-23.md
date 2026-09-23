# Align BOS, CHoCH, liquidity, and AI to 10-bar swings

## Goal
Make the Terminal’s confirmed HH/HL/LH/LL labels, BOS/CHoCH events, liquidity lines, and the AI’s structure/liquidity answers use the same non-repainting 10-bar fractal pivots.

## Changes
- Recalculate chart BOS/CHoCH from the existing 10-bar confirmed pivot set instead of the separate 2-bar structure set.
- Build chart buy-side and sell-side liquidity from those same confirmed 10-bar highs and lows.
- Keep live HH/HL/LH/LL labels provisional and dashed; they will not create BOS/CHoCH or liquidity until ten later candles confirm the pivot.
- Update the AI’s XAU/USD structure and advanced-liquidity evidence to use the same 10-bar radius, while leaving unrelated candle-pattern and POI calculations unchanged.
- Update chart context wording so the AI is explicitly told that displayed structure, breaks, and liquidity all use the 10-bar method.

## Verification
- Add regression tests proving a smaller 2-bar swing no longer creates a chart break or liquidity line.
- Verify a confirmed 10-bar pivot does create the expected liquidity level and close-confirmed BOS/CHoCH.
- Run the chart and analysis test suites plus the TypeScript check.
- Open the signed-in Terminal and compare the visible 30-minute labels/lines with the AI’s answer on the same chart.

## Technical details
- Preserve strict close confirmation: wick-only breaches remain sweeps, not BOS/CHoCH.
- Preserve causal behavior: a 10-bar pivot becomes usable only after ten candles close to its right.
- Increase the structure scan window where needed so radius 10 still has enough historical pivots.
- Do not alter saved indicators, drawings, scripts, or user chart preferences.
