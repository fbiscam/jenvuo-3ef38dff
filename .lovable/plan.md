## Pricing page — themed redesign + feature blocks

Make the pricing page feel like the rest of the Terminal-style site (homepage / insights / contact) and add visual feature blocks so users instantly understand what each plan unlocks.

### 1. Header chrome (match homepage)
- Add live ticker bar above header (same `useLiveTicker` strip used on `/app` and homepage).
- Status pill (`PRICING_DESK // LIVE`) centered absolutely like other pages.
- Add Dashboard pill + Launch button on the right.

### 2. Hero refinement
- Add an institutional `[ 01 / PRICING ]` index marker, mono uppercase eyebrow.
- Headline + sub stays, but add a 4-stat row underneath: "A+ Setups · ICT/SMC · <30s Alerts · 25Y Methodology" in mono pill style.

### 3. Plan cards — keep current 3 cards (already themed) but polish
- Add a small icon badge with conic-gradient ring around the tier icon (matches dashboard "Launch AI" card aesthetic).
- Add per-card "Best for" tag at top (e.g. Free → "Curious", Pro → "Active trader", Elite → "Desk / fund").
- Soften Pro card: keep dark but use subtle iridescent shadow instead of flat black.

### 4. NEW: "What you actually get" feature blocks (with images)
A 3-column grid of feature cards under the pricing tiers, each with a generated image + title + bullet description. Six blocks total in a 3×2 grid:

| Block | Image | Title |
|---|---|---|
| 1 | Voice waveform + orb | Voice-first analysis |
| 2 | TradingView-style chart with FVG / OB markings | ICT & SMC narration |
| 3 | A+ signal alert email mockup | Realtime A+ alerts |
| 4 | Trade journal dashboard mockup | Trade journal & analytics |
| 5 | Multi-pair scanner grid | Multi-timeframe bias |
| 6 | API / webhook code snippet visual | API access (Elite) |

Each card: white bg, zinc-200 border, hover lift, mono caption + sans title + 1-line description. Images generated via `imagegen` (1024×768 jpg) and stored at `src/assets/pricing-*.jpg`.

### 5. NEW: "Plan comparison" matrix table
Below feature blocks — a clean dense comparison table (Free vs Pro vs Elite) listing every capability with check / dash / value cells. Black header row, hover row tint, mono cell labels.

### 6. FAQ section (keep, restyle)
Match insights page's pill-style accordions: rounded-2xl with subtle hover, add a small `[ FAQ ]` mono eyebrow.

### 7. Footer
Already uses `SiteFooter` — no change.

### Technical details
- All edits in `src/routes/pricing.tsx` (single file).
- Generate 6 images via `imagegen--generate_image` (fast model, jpg) into `src/assets/pricing-{voice,ict,alerts,journal,scanner,api}.jpg`.
- Reuse existing tokens (zinc palette, MONO/SANS fonts). No new CSS variables.
- Keep `zoom: 1.25` as user requested previously.

### Layout sketch

```text
┌─ ticker strip ───────────────────────┐
├─ header (logo · pill · launch) ──────┤
├─ hero (eyebrow · h1 · sub · stats) ──┤
├─ 3 pricing cards ────────────────────┤
├─ feature blocks 3×2 (image + text) ──┤
├─ comparison matrix table ────────────┤
├─ FAQ accordion ──────────────────────┤
└─ SiteFooter ─────────────────────────┘
```
