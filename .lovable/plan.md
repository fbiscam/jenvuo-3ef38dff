# Model-independent ICT/SMC extension analysis

## Goal
Make XAU/USD chart and trade-plan analysis work without depending on any AI model, so an unavailable provider cannot cause “Server busy” during analysis.

## Changes
- Use the existing deterministic ICT/SMC engine as the source of truth for direction, entry type, entry/POI, stop, targets, risk/reward, confidence, and WAIT decisions.
- Expand the extension analysis path to run a full multi-timeframe XAU/USD rules pass using live candles: H4/H1 bias, 15M execution, BOS/CHoCH, liquidity sweeps, FVG/order blocks, premium/discount, session timing, displacement, rejection, ATR risk, and weighted vetoes.
- Add a second deterministic “senior review” pass that independently validates the setup and either confirms it or changes the final result to WAIT with concrete reasons.
- Format the final response directly in the user’s language without calling a model. Keep chart marks and the displayed levels derived from the same calculation.
- Keep the newly saved private endpoint and key only for ordinary conversational chat; they will not be required for chart analysis or trade plans.
- Update extension status text so it reports rule-engine analysis and deterministic review rather than model names.
- Rebuild the latest extension package and verify a live XAU/USD request, extension syntax, and TypeScript.

## Technical notes
- Reuse `src/lib/analysis/engine.ts`; do not create a fake AI response or hardcoded signal.
- Remove model calls only from the extension’s analysis branch. Authentication, plan limits, billing, XAU/USD-only enforcement, and ordinary chat remain unchanged.
- `src/lib/utils.ts` is already valid and the current full TypeScript check passes; no unsafe workaround will be added for the stale diagnostic.
