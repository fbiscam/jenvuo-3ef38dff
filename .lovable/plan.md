## GoldGPT — Jarvis-style XAU/USD Trading AI

A Jarvis-inspired AI trading assistant specialized in **Gold (XAU/USD)** with voice + text input, live TradingView charts, and ICT/SMC analysis powered by Lovable AI + live price feed.

### Core Features

1. **Jarvis-style UI**
   - Dark futuristic theme (deep navy/black, gold accents, neon cyan glow)
   - Animated voice orb (pulses while listening/speaking)
   - Status indicator: "Listening… / Thinking… / Speaking…"
   - Chat-style command log

2. **Dual Input**
   - Text input box (type commands)
   - Mic button using browser Web Speech API (free, instant)
   - Example commands: *"Analyze gold 15 minute"*, *"Give me A+ setup on XAU"*, *"What's the bias on 1H?"*

3. **Voice Output**
   - Browser `speechSynthesis` reads out key takeaways (bias, entry, SL, TP)
   - Male confident voice preferred (auto-pick available system voice)
   - Speaks only the critical lines; full analysis shown on screen

4. **TradingView Chart Panel**
   - Embedded TradingView Advanced Chart widget (free)
   - Symbol locked to `OANDA:XAUUSD`
   - Timeframe switcher: 1m, 5m, 15m, 1H, 4H, 1D
   - Auto-loads ICT/SMC-style indicators (Volume, RSI, fair value gap-friendly tools available in widget studies)
   - Chart updates when user says/types a timeframe

5. **Live Price Feed → AI Analysis**
   - Free gold price API: **Twelve Data** (free tier, supports XAU/USD OHLC) — requires user-provided API key (free signup)
   - Backend server function fetches recent candles for requested timeframe
   - Sends OHLC + user query to **Lovable AI** (`google/gemini-3-flash-preview`)
   - System prompt: 25+ years gold trading expert, ICT/SMC framework, mention BOS/CHOCH, order blocks, FVG, liquidity sweeps, premium/discount zones, killzones (London/NY)
   - Returns structured A+ setup: **Bias, Entry zone, Stop Loss, TP1/TP2/TP3, Risk:Reward, Confluences, Confidence %**

6. **Signal Card**
   - Clean card UI showing setup with color-coded BUY/SELL
   - Copy-to-clipboard button
   - History of past signals in session

### Tech & Files

- Stack: TanStack Start + Lovable AI Gateway (built-in, no key needed)
- Twelve Data API key: requested via `add_secret` after user confirms
- New files:
  - `src/routes/index.tsx` — main Jarvis dashboard (chart + voice orb + chat)
  - `src/components/VoiceOrb.tsx` — animated mic orb
  - `src/components/TradingViewChart.tsx` — TV widget embed
  - `src/components/SignalCard.tsx` — A+ setup display
  - `src/components/CommandInput.tsx` — text + mic input
  - `src/hooks/useSpeech.ts` — Web Speech API wrapper (STT + TTS)
  - `src/lib/gold-analysis.functions.ts` — server fn: fetch candles + AI analysis
  - `src/lib/ai-gateway.server.ts` — Lovable AI provider helper
- Update `src/styles.css` — Jarvis dark theme tokens (gold/cyan accents, glow shadows)
- Update `src/routes/__root.tsx` — SEO title "GoldGPT — AI Gold Trading Assistant"

### Flow

```text
User says/types "Analyze gold 15m"
   ↓
Web Speech recognizes → CommandInput
   ↓
Parse intent (symbol=XAUUSD, tf=15m)
   ↓
Chart panel switches to 15m
   ↓
Server fn → Twelve Data (last 100 candles) → Lovable AI
   ↓
SignalCard renders A+ setup
   ↓
speechSynthesis speaks: "Bullish bias. Entry 2340, SL 2335, TP 2355."
```

### Out of scope (this iteration)
- Real broker order execution
- User accounts / saved signals across sessions
- Backtesting
- Multi-pair (only gold per your request)
