## Problem

On `/signal`, the agent used to **draw markings one-by-one while speaking each step** (BOS → OB → FVG → liquidity → entry/SL/TP). Right now most analyses don't show that flow — the chart either stays bare or markings appear all at once with no narration. Root causes I found:

1. **Narration gated behind Pro** (`src/routes/signal.tsx:208`): free / non-`full_ict` users never trigger `runNarration`, so they see zero step-by-step marking + voice.
2. **Speech autoplay fails silently** — `speech.speak()` resolves immediately when the browser blocks audio (no user gesture yet), so the loop blasts all markings in <1s with no voice and no pause.
3. **AI-returned `markingIndex`** is frequently `null` or out of range, so even when narration runs, most steps draw nothing on the chart.
4. **No visual emphasis** — drawn boxes fade in but the chart doesn't pan/zoom to the new marking, so users don't see what the agent is talking about.
5. **Engine entry/sl/tp + key zones are appended last**, never linked to narration steps, so the climactic "Entry here, SL here, TP here" moment is missing.

## Plan

### 1. Always run the guided narration (`src/routes/signal.tsx`)
- Remove the `credits.features.full_ict` gate around `runNarration`. Run it for every successful analysis. Keep the existing per-signal credit spend (it already covers the analysis cost); drop the second `ict_narration` spend so free users get the visual+voice walkthrough as the core product.
- Show a small "Voice muted — tap to enable" pill if `SpeechSynthesis` is blocked, and play the walkthrough silently (chart still animates) with captions.

### 2. Build a deterministic narration script in code (`src/lib/gold-analysis.functions.ts`)
After the engine produces `allMarkings`, synthesize a guaranteed 10-step script with correct `markingIndex` values, in this order:
1. HTF bias + structure
2. HTF BOS / CHOCH (find first `bos|choch` with `tf:"htf"`)
3. HTF OB or demand/supply zone
4. Premium vs Discount (point to `premiumZone`/`discountZone`)
5. HTF liquidity (PDH/PDL/EQH/EQL)
6. Shift to LTF
7. LTF FVG
8. LTF OB / breaker
9. Entry (engine entry marking)
10. SL + TP (two quick steps)

Use AI-written `say` text when an aligned step exists; otherwise fall back to a templated sentence built from the marking's label and price. This way every step **always** has both a sentence and a marking to draw.

### 3. Cinematic step rendering (`src/components/SignalChart.tsx` + `signal.tsx`)
- Add `focusMarking(m)` to `SignalChartHandle`: pans the time scale so the marking's `fromTime..toTime` is centered, then briefly pulses the box (outline 2px → 1px, 1s) so the eye locks on.
- When `runNarration` advances a step:
  - `drawMarking(m)` on the correct TF chart
  - `focusMarking(m)` on that same chart
  - dim the *other* TF chart to 55% opacity for that step, restore on next
- Highlight the matching narration row in the side feed (already partly wired via `data-step`); add a left accent bar + soft background on the active row.

### 4. Reliable speech pacing (`src/hooks/useSpeech.ts` + `signal.tsx`)
- `speakWait` should resolve only on the real `utterance.onend`, with a fallback timer of `max(2.5s, words*0.35s)` if `onend` never fires (Chrome bug on long utterances).
- If `SpeechSynthesis` is unavailable or `speak` returns immediately without firing `onstart` within 250ms, switch to **caption-only mode**: still pause `max(2.5s, words*0.35s)` between steps so the chart animation reads like a guided tour.

### 5. Final trade reveal
After step 10, draw entry/SL/TP price lines together, focus the LTF chart on them, and speak the `trade.summary` line. Toast "Setup ready · A+ / A / B" using the existing `setupGrade`.

### Technical Details
- Files touched: `src/routes/signal.tsx`, `src/lib/gold-analysis.functions.ts`, `src/components/SignalChart.tsx`, `src/hooks/useSpeech.ts`.
- No DB / backend schema changes. Credit cost stays the same (one `signal` spend per analysis).
- No new dependencies; uses `lightweight-charts` APIs already imported (`timeScale().setVisibleRange`, `priceToCoordinate`).

### Out of scope
- Changing the analysis engine math or scoring weights.
- Redesigning the page layout — only the chart animation, feed highlight, and voice flow change.
