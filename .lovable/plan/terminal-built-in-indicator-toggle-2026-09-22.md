# Terminal Built-in Indicator Toggle

## Goal
Add a clear hide/show control for the Terminal chart’s supported built-in TradingView indicators.

## Changes
- Keep the current embedded XAU/USD TradingView chart and existing timeframe behavior.
- Add an Indicators toggle beside the chart controls.
- When enabled, load the existing built-in EMA and RSI studies; when disabled, reload the chart without those studies.
- Save the indicator visibility preference in the browser so it remains consistent after reload.
- Use accessible labels and the existing Terminal visual style.

## Technical details
- Update the Terminal settings state and persisted settings object with an `indicatorsVisible` boolean.
- Build the TradingView widget URL from that state, passing the supported study list only while enabled.
- Use the project Button component for the control.
- Verify the toggle visually in the signed-in Terminal and confirm TypeScript is clean.

## Scope note
The pasted custom Pine Script will not run inside TradingView’s embedded widget. This implementation covers TradingView-supported built-in studies only, as selected.
