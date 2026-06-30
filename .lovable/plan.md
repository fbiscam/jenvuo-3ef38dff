
## Goal

Every signal Jenvu emits should feel like a 25-year ICT/SMC trader's A+ setup — not a guess. We do that by feeding the AI **structured market data** (not raw prompts), running a **deterministic checklist** first, and only invoking the LLM for narration/confirmation. Cheap model, high accuracy.

## Model choice

- **Primary**: `google/gemini-3.1-flash-lite` — cheapest, fast, great at structured JSON output.
- **Fallback / heavy reasoning** (only when score is borderline 75–84): `google/gemini-3-flash-preview`.
- Everything else (voice replies, narration) stays on Flash Lite.

Reason: the *analysis* is done in code with raw OHLCV math. The LLM only **labels, narrates, and sanity-checks**. So model cost stays low and quality stays high.

## The 7-stage pipeline (runs per signal request + every 15min via cron)

```text
1. DATA FETCH      → OHLCV M5/M15/H1/H4/D1 + DXY + live price + news window
2. STRUCTURE       → BOS/CHoCH, swing highs/lows, trend per TF (code, not AI)
3. LIQUIDITY MAP   → equal highs/lows, Asia/London/NY session pools, PDH/PDL
4. ICT/SMC ZONES   → FVGs, Order Blocks, Breakers, Mitigation blocks (code)
5. CONFLUENCE      → HTF bias + LTF entry zone + killzone + DXY correlation
6. SCORE (0-100)   → weighted checklist → only ≥85 = A+ signal
7. AI NARRATION    → Gemini Flash Lite writes the "why" + risk plan
```

Stages 1–6 are **pure TypeScript** in `src/lib/analysis/`. No AI cost, fully deterministic, testable. Stage 7 is the only LLM call.

## Stage details

**1. Data fetch** (`src/lib/analysis/data.ts`)
- Pull XAUUSD candles from existing Binance WS + a REST source (TwelveData/Yahoo backup) for 5 timeframes.
- Pull DXY for correlation (gold inverse).
- Pull last 3h of high-impact news from existing `news.functions.ts`.

**2. Market structure** (`structure.ts`)
- Compute swing points (fractal, lookback=5).
- Detect BOS (break of structure) and CHoCH (change of character) per TF.
- Output: `{ trend: 'bullish'|'bearish'|'ranging', lastBOS, lastCHoCH }` per TF.

**3. Liquidity map** (`liquidity.ts`)
- Equal highs/lows (tolerance = 0.05% of price).
- Session pools: Asia high/low, London high/low, prior day H/L, prior week H/L.
- Mark which pools are **unswept** (= magnets).

**4. ICT/SMC zones** (`zones.ts`)
- **FVG**: 3-candle imbalance, tag as bullish/bearish, mark mitigated/unmitigated.
- **Order Block**: last opposing candle before impulsive BOS.
- **Breaker**: failed OB after CHoCH.
- **Premium/Discount**: 50% of last dealing range.

**5. Confluence engine** (`confluence.ts`)
- HTF bias (H4+D1 agree) ✓
- LTF entry zone is unmitigated OB or FVG ✓
- Entry sits in discount (for buys) / premium (for sells) ✓
- Liquidity sweep just occurred ✓
- Inside active killzone (London 7-10 UTC, NY 12-15 UTC) ✓
- DXY confirms (inverse moving) ✓
- No red-folder news in next 30min ✓

**6. Scoring** (`score.ts`)

| Factor | Weight |
|---|---|
| HTF bias alignment (H4+D1) | 25 |
| Liquidity sweep before entry | 20 |
| Unmitigated FVG / OB at entry | 15 |
| Premium/Discount correct side | 10 |
| Killzone active | 10 |
| DXY correlation confirms | 10 |
| Clean R:R ≥ 1:3 to next liquidity | 10 |

- **≥ 85** → A+ signal, emit + alert.
- **70–84** → "watching" (shown on signal page, no alert, no credit charge).
- **< 70** → discarded silently.

This is the gate that makes every emitted signal A+.

**7. AI narration** (`narrate.functions.ts`)
- Single Gemini Flash Lite call. Input = the structured JSON from stages 1–6.
- Output (strict JSON via `Output.object`): `{ headline, ictNarrative, smcNarrative, riskPlan, invalidation, confidenceWord }`.
- Prompt forces it to **cite the data** ("price swept Asia high at 2657.4, then CHoCH on M15…") — no generic fluff. Temperature 0.3.

## Entry / SL / TP (deterministic, not AI)

- **Entry**: midpoint of the chosen OB/FVG.
- **SL**: 2 pips beyond the OB/FVG extreme (or beyond swept liquidity).
- **TP1**: nearest opposing liquidity pool. **TP2**: next HTF liquidity. **TP3**: 1:5 extension.
- AI never invents prices — it only explains them. Eliminates hallucinated entries.

## Wiring into the app

- New module: `src/lib/analysis/` (data, structure, liquidity, zones, confluence, score, types).
- New server fn: `generateAplusSignal` in `src/lib/signals.functions.ts` — runs pipeline, calls narration, deducts credits (existing `spend('signal')`).
- `src/routes/signal.tsx` switches to call this fn; replaces current ad-hoc analysis. Shows score badge + checklist breakdown so user *sees* why it's A+.
- `src/routes/api/public/hooks/scan-signals.ts` (already exists, pg_cron) calls the same pipeline every 15min; only inserts into `signal_alerts` when score ≥ 85 — keeps the alert system honest.
- Closed-market handling unchanged (skip emission).

## What the user sees

- Signal card gains a **"A+ Score: 92/100"** ring + a 7-line confluence checklist (✓/✗ per factor).
- Narration is grounded in real prices, not generic ICT essays.
- Alerts (5 credits) fire **only** for A+; "watching" setups are free to view.

## Out of scope (this build)

- Backtesting harness (next pass).
- Multi-pair (still gold-only as per product).
- Replacing the existing chart drawing — visuals stay, data source becomes the new pipeline.
