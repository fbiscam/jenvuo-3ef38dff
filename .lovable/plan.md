# Supercharge the Signal AI Engine

Goal: Make the AI think deeper, use richer ICT/SMC concepts, and produce more accurate A+ signals across all supported pairs.

## Current State (baseline)

- `src/lib/analysis/engine.ts` — deterministic math: swings, BOS/CHoCH, FVG, OB, liquidity pools, 7-factor weighted score (bias, sweep, zone, PD, killzone, DXY, RR).
- `src/lib/gold-analysis.functions.ts` — pulls candles, runs engine, calls **`google/gemini-3.1-flash-lite`** (cheapest tier) to build/narrate the plan.
- `src/lib/signal-agent.functions.ts` — chat agent also uses lite model.
- `src/routes/api/public/hooks/scan-signals.ts` — 15-min cron scanning A+ setups.

**Weak points:**
1. Model is the cheapest tier → shallow reasoning, generic narration.
2. Killzone weight fixed at 10% for every pair (Gold-tuned only).
3. Missing ICT concepts: breaker blocks, IFVG (inverted FVG), mitigation blocks, dealing-range PD arrays, turtle soup, judas swing, SMT divergence, session liquidity map, day-of-week bias.
4. No hard-veto gates — score alone decides A+, so weak setups sometimes slip through.
5. No self-critique / second-pass review before emitting A+.
6. Correlation only checks DXY (wrong for JPY crosses, indices, crypto).

## Plan

### 1. Upgrade reasoning models
- Swap `google/gemini-3.1-flash-lite` → **`google/gemini-3.5-flash`** for the main narration pass (better reasoning, still fast/cheap).
- Add optional **"senior trader review" pass** using **`google/gemini-2.5-pro`** — triggered only when Stage-1 grade ≥ A. Can veto/downgrade or confirm A+.
- Chat agent (`signal-agent.functions.ts`) → also upgraded to `gemini-3.5-flash`.

### 2. Expand deterministic ICT/SMC detection in `engine.ts`
New detectors:
- **Breaker Block** — failed OB that flipped after structure break.
- **Inverted FVG (IFVG)** — violated FVG now acting as opposite bias.
- **Mitigation Block** — partial-fill zone tracking.
- **Dealing Range** — last confirmed swing H↔L with premium / equilibrium / discount split.
- **Turtle Soup** — false break of PDH/PDL/PWH/PWL + immediate reversal.
- **Judas Swing** — first-hour opening drive reversal in London/NY.
- **SMT Divergence** — Gold↔DXY, EURUSD↔GBPUSD, JPY-crosses↔USDJPY, NAS↔SPX.
- **Session Liquidity Map** — Asia H/L, London H/L, NY open range.
- **Day-of-Week Bias** — Tue-Thu trend days weighted higher, Mon/Fri manipulation.

### 3. Pair-specific tuning (`PAIR_PROFILES`)
Per-instrument config:
- Correct killzones (Gold, FX majors, JPY crosses, indices, crypto).
- ATR-based SL buffer (replaces fixed 0.08%).
- Correlation instrument for SMT (DXY for EUR/GBP, USDJPY for JPY crosses, NAS/SPX for indices, BTC.D for alts).
- Session-alignment multiplier: killzone weight jumps to 15-20% when pair is in its native session.

### 4. Rework scoring with hard-veto gates
Auto-downgrade to WAIT (regardless of score) if any of:
- HTF & LTF bias conflict
- No liquidity sweep before entry zone
- Entry zone already mitigated
- High-impact news within 30 min
- R:R < 1.8

Only when all vetos pass, run weighted score. Add factors: `structure_quality`, `smt`, `session_alignment`. New thresholds: **A+ ≥ 88, A ≥ 75, B ≥ 60**.

### 5. Two-stage AI pipeline
```
Stage 1 (fast)  → gemini-3.5-flash: generates plan from deterministic context
Stage 2 (deep)  → gemini-2.5-pro (only if grade ≥ A): validates plan, can veto/downgrade
Stage 3         → final spokenSummary + step-by-step narration
```

### 6. Richer prompt context to AI
Prompt now includes:
- Full dealing range with premium/discount %
- Last 3 structure events per timeframe (not just last one)
- Nearest 5 unmitigated zones (OB / FVG / Breaker) with distance in pips
- Session liquidity map (Asia/London/NY H-L, PDH/PDL, PWH/PWL)
- SMT divergence status
- Day-of-week + upcoming news window
- Historical hint: "last 10 A+ setups on this pair had X% win rate" (from `signals` table)

### 7. Self-critique in Stage 2
Pro model must answer 3 checks:
- "Would a 25-year institutional trader take this trade? Why/why not?"
- "What's the strongest counter-argument?"
- "Is entry chasing price or waiting at premium/discount?"

Any negative answer → downgrade one tier or force WAIT.

## Files touched

- `src/lib/analysis/engine.ts` — new detectors, `PAIR_PROFILES`, reworked `scoreSetup` with veto gates + new factors.
- `src/lib/gold-analysis.functions.ts` — model swap, Stage-2 deep-review call, expanded context builder, self-critique parser.
- `src/lib/signal-agent.functions.ts` — model swap to `gemini-3.5-flash`.
- `src/routes/api/public/hooks/scan-signals.ts` — new thresholds, alert only on Stage-2-confirmed A+.

**No database schema changes** — new confluences fit inside existing `confluences[]` and `key_levels[]` columns.

**Credit impact per signal:** ~2-3× current cost per emitted A+ (flash on every scan + pro only on ~20% of candidates). Accuracy gain far outweighs.

## Out of scope (ask separately)
- Real news API integration (still uses time-window heuristic)
- Backtesting to auto-tune weights
- ML pattern recognition

Approve to build.