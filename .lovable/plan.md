## Signal Page v2 — "Institutional Desk"

Add 4 advanced trading features and polish the existing white aesthetic. No theme switch, no journaling, no voice commands.

### 1. Multi-Timeframe Alignment

**Server (`gold-analysis.functions.ts`)**
- Fetch 4 timeframes in parallel: 4H, 1H, 15M, 5M (already cached, no new providers).
- For each TF, compute bias locally (no AI call) from: last-50-candle structure (HH/HL vs LH/LL), 20-EMA slope, and current price vs equilibrium.
- Return `multiTf: { tf, bias, label, score }[]` plus aggregate `alignmentScore` (0–100) and `alignmentLabel` (`Strong Bullish` / `Mixed` / `Strong Bearish`).
- AI prompt now receives the alignment summary, so narration references it.

**UI**
- New `MultiTfStrip` row above the charts: 4 pills (4H · 1H · 15M · 5M), each color-coded (emerald/rose/zinc), with a tiny direction arrow.
- Right rail shows the aggregate score as a horizontal gradient bar.

### 2. Advanced ICT/SMC Markings

**Server — extend `markings` types**
Current types: FVG, OB, BOS, CHoCH, entry, sl, tp.
Add detectors (pure functions, no AI):
- **Liquidity pools** — buy-side (`BSL`) and sell-side (`SSL`) above/below recent equal highs/lows.
- **EQH / EQL** — equal highs/lows within 0.05% tolerance (drawn as dashed lines with double-arrow label).
- **Premium / Discount zones** — split dealing range into upper 50% (premium, red tint) and lower 50% (discount, green tint).
- **OTE zone** — 62–79% Fib of last swing leg, drawn as a golden band.
- **Breaker block** — failed OB after structure break.
- **Mitigation block** — unmitigated OB inside discount/premium.

**Chart (`SignalChart.tsx`)**
- Extend `drawMarking` switch to render new types as colored rectangles, dashed lines, and labeled bands using `lightweight-charts` price-line + series-rectangle primitives we already use.
- Each marking type gets a distinct color token (defined in component, not theme).
- Add a small legend chip row above each chart (toggleable: tap to hide that marking class).

### 3. Live Trade Tracker

**Client-side polling (no DB write)**
- After plan loads with a `BUY`/`SELL` trade, start a 15-second poll of `getLiveTick({ symbol })` — a new lightweight server fn that returns just `{ price, t }` (reuses provider cascade, no AI).
- Track state machine: `PENDING → FILLED → TP1 → TP2 → TP3 / STOPPED`.
- Detect: entry fill when price touches entry ±1 tick; SL/TP when price closes through level.
- **R-multiple bar**: visual horizontal bar from SL (left) → entry (center) → TP (right), with a live dot showing current price.
- **Trailing SL** option (toggle): once price reaches 1R, suggest moving SL to entry; at 2R, suggest SL to TP1. Pure suggestion display, no auto-execute.
- Toast + voice line when each event fires ("Entry filled at 2645.20", "TP1 hit, +1R secured").

**UI** — new card in right rail above Trade Plan:
- Status badge (`PENDING` / `RUNNING` / `WIN` / `LOSS`)
- Live PnL in R (`+1.4R`) and price distance to next level
- Mini sparkline of price since signal generation

### 4. A+ Setup Score + Confluence Checklist

**Server — compute on the fly**
8-point checklist evaluated locally:
1. HTF bias aligned with trade direction
2. Inside killzone (London/NY open)
3. Liquidity sweep before entry
4. FVG present in entry zone
5. Entry inside OTE (62–79%)
6. RR ≥ 2.0
7. Premium/discount alignment (sell from premium, buy from discount)
8. News clear (no high-impact within 60 min)

Each item: pass / fail / neutral, with a 1-line reason. Aggregate to score 0–100 → grade band: `A+` (≥85), `A` (70–84), `B` (55–69), `C` (<55).

**UI** — new card in right rail (top, above News):
- Big grade letter (gradient text) + score bar
- Compact 8-row checklist with green check / red × / zinc dot + tooltip on hover for the reason
- If grade ≤ C, show a subtle "Lower-conviction setup — consider standing aside" hint

### 5. White-Theme Polish

Targeted refinement only — no palette swap:
- Replace flat `bg-white` panels with layered `bg-white` + 1px inner ring + soft `shadow-[0_1px_0_rgba(0,0,0,0.02)]` for depth.
- Charts: thin gridlines `#F4F4F5`, marking labels in JetBrains Mono with white halo for legibility.
- Smooth `framer-motion` enter for the new cards (stagger 60ms, fade + 4px Y).
- Better empty/loading skeletons (shimmer instead of static).
- Tighter density: terminal card padding `p-5` → `p-4`, tighter monospace label tracking.

### File touch list

**Server**
- `src/lib/gold-analysis.functions.ts` — add multi-TF computation, new marking detectors, A+ scoring, extend `SignalPlan` type.
- `src/lib/gold-analysis.functions.ts` — new `getLiveTick` server fn (price-only, no AI).

**Client**
- `src/components/SignalChart.tsx` — render new marking types, legend chip row.
- `src/routes/signal.tsx` — `MultiTfStrip`, `TradeTrackerCard`, `SetupScoreCard`, polish.
- `src/components/signal/` (new folder) — split the three new cards into their own files so the route stays readable.

### Out of scope (confirmed)

- No dark mode toggle.
- No DB-backed trade journal.
- No voice command handler.
- No new market providers — reuse Binance/Yahoo cascade.

Build sequentially: server detectors first → chart rendering → right-rail cards → live tracker → polish pass.