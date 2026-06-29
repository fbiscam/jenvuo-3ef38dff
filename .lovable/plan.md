# Live Signal Page with Chart Markings & Voice Narration

Jab user voice/text mein "signal", "setup", "trade idea", "analyze gold" jaisa kuch bole — app naye `/signal` route pe navigate karega, real XAU/USD candles load karega, AI us pe ICT + SMC markings draw karega, aur Jenvu voice step-by-step samjhayegi ke "yeh dekho, yahan FVG hai, yahan se entry, yahan SL…".

## User Flow

```text
Home (orb)
   │  user: "Jenvu, give me a gold signal"
   ▼
intent detector picks up "signal/setup/trade"
   │  navigate("/signal")
   ▼
/signal page
   ├─ Top: HTF chart (1H) with bias markings
   ├─ Main: LTF chart (15m) with entry/SL/TP + zones
   ├─ Right: live narration log + signal card
   └─ Voice: speaks each step as it gets drawn
        "Loading gold price… HTF bias bullish… FVG mil gaya 2645–2648…
         Order block yahan… Entry 2646, SL 2642, TP 2655, RR 1:2.25"
   ▼
Back button → home orb
```

## What Gets Built

### 1. New route `src/routes/signal.tsx`
- Two stacked charts (HTF 1H + LTF 15m) using `lightweight-charts` (TradingView OSS).
- Right sidebar: live narration feed (each AI step as a chip), final `SignalCard`, "Back to Jenvu" button.
- Auto-runs analysis on mount; re-run button for refresh.
- Reuses dark/light theme from home.

### 2. Chart component `src/components/SignalChart.tsx`
- Wraps lightweight-charts candlestick series.
- Exposes imperative API to draw:
  - **FVG** → colored rectangle (price range across N candles)
  - **Order Block** → filled box on the OB candle
  - **Liquidity** → horizontal dashed line + "BSL/SSL" label
  - **BOS/CHOCH** → trendline + text marker
  - **Supply/Demand zones** → semi-transparent boxes
  - **Entry / SL / TP** → 3 priceLines with R:R box overlay
- Each draw call animates in (fade) so user dekhta hai "kya draw ho raha hai".

### 3. Live data `src/lib/market-data.functions.ts`
- Server function fetches XAU/USD candles from Twelve Data free API.
- Returns 1H (last 200 candles) + 15m (last 300 candles).
- Cached 60s to respect rate limit.
- **Requires:** Twelve Data API key (free tier, user signup).

### 4. AI analysis upgrade `src/lib/gold-analysis.functions.ts`
- Extends current Gemini call to return a **structured** plan:
  ```json
  {
    "htfBias": "bullish",
    "narration": ["Step 1…", "Step 2…", …],
    "markings": [
      {"type":"fvg","tf":"15m","from":2645,"to":2648,"startIdx":120,"endIdx":135,"label":"Bullish FVG"},
      {"type":"orderBlock","tf":"1h","candleIdx":85,"label":"Demand OB"},
      {"type":"liquidity","tf":"15m","price":2652,"side":"buy","label":"BSL sweep target"},
      {"type":"bos","tf":"1h","fromIdx":60,"toIdx":90,"price":2640,"label":"Bullish BOS"}
    ],
    "trade": {"direction":"BUY","entry":2646,"sl":2642,"tp":2655,"rr":2.25,"confidence":87}
  }
  ```
- Sends both HTF + LTF candle arrays to Gemini 2.5 Flash with strict ICT/SMC prompt.

### 5. Voice narration sequencer (in `signal.tsx`)
- Iterates over `narration[]` array.
- For each step: speak the line, simultaneously trigger the matching `markings[]` draw on chart.
- ~1.5s pause between steps so user can see + hear.
- Final step: read out the trade levels.

### 6. Intent routing (home page)
- In `src/routes/index.tsx`, after AI reply, if `signal.direction !== "WAIT"` OR user text matches `/signal|setup|trade idea|analyze/i`, navigate to `/signal` instead of just speaking.

## Files Touched

```text
NEW  src/routes/signal.tsx
NEW  src/components/SignalChart.tsx
NEW  src/lib/market-data.functions.ts
EDIT src/lib/gold-analysis.functions.ts  (structured markings output)
EDIT src/routes/index.tsx                (intent → navigate)
DEPS bun add lightweight-charts
SECRET TWELVE_DATA_API_KEY
```

## What I Need From You Before Building

1. **Twelve Data API key** — free signup at twelvedata.com (800 req/day free). I'll request it via secret prompt when you approve.
2. **Confirm OK** to add `lightweight-charts` library (~40kb, MIT).

Once you approve, I'll build it end-to-end and you can say "Jenvu, gold signal" to see it live.
