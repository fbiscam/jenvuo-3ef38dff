## Goal

Right now the signal page already supports every asset (Gold, Silver, BTC, ETH, SOL, BNB, XRP, DOGE, EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD) with the same ICT/SMC engine, charts, killzone, news risk, auditor, and chart markings. The gap is the **handoff from the voice agent on the home page** — it always opens the signal page with Gold, no matter what asset the user asked for, and only triggers on words like "signal/setup/chart".

This plan closes that gap so every pair behaves exactly like Gold end-to-end.

## What changes

### 1. Symbol extraction from voice/text (home page)
Add a helper that scans the user's command for any supported asset and returns its key. Recognizes:

- Crypto: `bitcoin|btc`, `ethereum|eth`, `solana|sol`, `bnb|binance coin`, `xrp|ripple`, `doge|dogecoin`
- Forex: `eur|euro|eurusd`, `gbp|pound|cable|gbpusd`, `usdjpy|jpy|yen`, `audusd|aussie`, `usdcad|loonie`, `usdchf|swissie`, `nzdusd|kiwi`
- Metals: `gold|xau|xauusd` (default), `silver|xag|xagusd`

### 2. Broader intent detection
Expand the trigger regex so any of these also opens the signal page:

- explicit verbs: `signal | setup | trade idea | plan | analyze | analysis | chart | live chart`
- asset name alone + action: `btc ka signal`, `analyze ethereum`, `eurusd chart`, `solana setup`
- direction words: `buy | sell | long | short` together with an asset

When an asset is detected but no explicit verb, default to opening the signal page for that asset (this matches the user's intent: "BTC ka analyze kar").

### 3. Pass the asset through the route
Navigate as `/signal?symbol=BTCUSD` (or whichever key was extracted). The signal route reads the `symbol` search param and uses it as the initial symbol instead of the hardcoded `XAUUSD` default. Re-analyze runs automatically on first load just like today.

### 4. Spoken handoff
Before navigating, the agent briefly says "Opening live <ASSET> analysis" so the user knows the command landed on the right pair.

### 5. Symbol picker on signal page (already exists, kept as-is)
The picker stays — users can still switch pair on the signal page itself and a re-analysis fires.

## Files touched

- `src/routes/index.tsx` — add `extractSymbol()` + `extractIntent()` helpers, update `handleCommand` to detect asset, speak the handoff line, and `navigate({ to: "/signal", search: { symbol } })`.
- `src/routes/signal.tsx` — declare a typed `validateSearch` for `?symbol=`, seed `useState<string>(search.symbol ?? "XAUUSD")` for the initial symbol.

No changes to the analysis engine, chart component, auditor, or news pipeline — they're already multi-asset.

## Out of scope

- No new assets added to the registry.
- No changes to the chart visuals or AI prompt.
- Voice replies on the home page still use the existing `analyzeGold` function for general chat; only routing to `/signal` becomes asset-aware.
