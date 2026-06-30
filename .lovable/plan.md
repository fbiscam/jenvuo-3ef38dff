## Goal
Voice/text agent on `/signal` should analyze **any** pair/coin/stock the user asks about (BTC, ETH, EURUSD, NAS100, AAPL, etc.) — not just the currently loaded symbol — and deliver a full ICT/SMC A+ breakdown like a 25-year institutional trader, narrating step-by-step.

## What's already in place
- `resolveInstrument()` in `gold-analysis.functions.ts` already supports **crypto, metal, forex, index, stock** (BTC, ETH, EURUSD, etc.).
- `getSignalPlan({ symbol })` already runs the full A+ pipeline (HTF bias, BOS/CHoCH, FVG, OB, liquidity, OTE, killzone) for any resolvable symbol.
- The agent endpoint `askSignalAgent` exists but only answers chat questions against the **currently loaded plan's context** — so when user asks "analyze BTC" while page is on XAUUSD, it says it can't.

## Changes

### 1. `src/lib/signal-agent.functions.ts` — make the agent symbol-aware
- Detect a target symbol in the user's question (regex: BTC, ETH, SOL, XAU, EURUSD, GBPUSD, USDJPY, NAS100, US30, SPX, AAPL, TSLA, etc., plus generic 3-letter base + USD/USDT).
- If a symbol is detected **and** differs from `context.symbol`:
  - Call `resolveInstrument()` + the internal A+ analysis pipeline (extract the reusable analysis core from `analyzeSignalPlan` so the agent fn can call it).
  - Build a fresh context block from that new plan (bias, score, entry/SL/TP, RR, killzone, key levels, FVG/OB/liquidity zones).
- Pass the (possibly switched) context to the LLM with an enhanced system prompt:
  - Remove "specialty is gold" wording → rewrite as: *"25-year institutional trader, master of every liquid market (FX, metals, indices, crypto, equities) using ICT + SMC at expert level."*
  - Require step-by-step pro narration: **(1) HTF bias & structure** → **(2) liquidity map** → **(3) POI (OB/FVG)** → **(4) entry trigger & confirmation** → **(5) SL placement logic** → **(6) TP ladder & RR** → **(7) invalidation & risk note**.
  - Speak in confident desk-trader voice, ICT/SMC vocabulary, no disclaimers, no "I can't analyze that."
- Return `{ reply, plan }` so the client can optionally render/draw the new symbol's setup.

### 2. `src/lib/gold-analysis.functions.ts` — expose reusable analyzer
- Extract the internal analysis body from `getSignalPlan` into a local helper `runFullAnalysis(symbol)` so `askSignalAgent` can invoke it without going through the route layer / credit spend.
- Keep `getSignalPlan` as the thin server-fn wrapper that calls `runFullAnalysis`.

### 3. `src/routes/signal.tsx` — let the agent switch the desk view
- When `askSignalAgent` returns a `plan` for a new symbol, update local `plan` state and navigate `?symbol=NEWSYM` so charts + ICT feed re-render for that asset.
- Narration (`speech.speak`) plays the agent's step-by-step reply while chart auto-marks zones via existing `highlightFromText`.
- Update placeholder copy: "Ask anything — BTC, ETH, EURUSD, NAS100, Gold…".

### 4. Symbol normalization
- Add lightweight aliases in `resolveInstrument`: `BITCOIN→BTC`, `GOLD→XAUUSD`, `NASDAQ→NAS100`, `SP500→SPX500`, `DOW→US30`, `OIL→USOIL`. Unknown symbols return a friendly "I couldn't resolve that ticker" reply instead of crashing.

## What stays the same
- Credit system, alerts, voice push-to-talk, orb UI, chart layout — untouched.
- Default symbol on first load remains XAUUSD.

## Acceptance
- On `/signal?symbol=XAUUSD`, asking "analyze BTC" / "BTC ka A+ setup do" / "what's the play on EURUSD?" triggers a full ICT/SMC narration for that symbol and switches the desk to it.
- Agent never refuses with "I can only analyze gold."
- Narration follows the 7-step institutional flow with explicit entry / SL / TP / RR / invalidation.
