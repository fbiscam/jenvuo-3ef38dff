# Upgrade the Jenvu trading extension

## Outcome
- Add the Jenvu site logo beside the extension title and show senior-review status in the header.
- Keep live XAU/USD data, API-key access, screen sharing, image attachment, chat history, and TradingView overlays working.
- Route extension analysis and mandatory senior review through BluesMinds only, avoiding Lovable AI credits.
- Improve ICT/SMC analysis with multi-timeframe structure, liquidity, FVG/order-block, displacement, session, entry, stop, targets, invalidation, and explicit WAIT reasoning.

## Implementation
- Probe the live BluesMinds model catalogue and test likely reasoning/vision models, including available DeepSeek candidates, without exposing the saved key.
- Use only models that complete real requests. If no BluesMinds DeepSeek model works, use the strongest tested BluesMinds alternatives and report that limitation rather than silently using Lovable AI.
- Expand the extension market snapshot from basic EMA/range data to deterministic ICT/SMC findings derived from fresh candles, and pass those findings to both analysis stages.
- Keep senior review mandatory: no final AI answer is returned unless an independent BluesMinds reviewer completes. Show the reviewer/model state in the extension.
- Return structured chart marks with the response and let the extension apply relevant marks to the active TradingView chart.
- Update the extension package version and downloadable ZIP.

## Validation
- Run live BluesMinds model probes and one real extension analysis request through the exact backend path.
- Check fresh quote timestamps, valid entry/SL/TP geometry, WAIT behavior when evidence is incomplete, senior-review metadata, billing records, and absence of Lovable Gateway calls from the extension path.
- Load the unpacked extension in Chromium where possible; otherwise validate its side-panel DOM/scripts and packaged ZIP contents.
- Run TypeScript and package consistency checks. Confirm `src/lib/utils.ts` directly; its reported line 8 is currently stale because the file has only six valid lines.

## Safety constraint
- The extension will present evidence-based analysis and risk controls, not promise guaranteed accuracy or profitability.