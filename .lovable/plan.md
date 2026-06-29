## Goal

Re-skin the `/signal` page so its layout & visuals match the homepage "Terminal Workstation" block (the section the user highlighted: `JENVU AI // SYSTEM_ACTIVE`, ICT Execution Feed, Intelligence Dashboard, status pills, mono labels). All existing functionality stays exactly the same — only the chrome, frame, and panel styling change.

## Scope

- File: `src/routes/signal.tsx` only.
- No changes to:
  - Chart logic (lightweight-charts setup, candles, markers, FVG/OB/BOS drawings)
  - AI narration / voice (`useSpeech`, narration loop, text composer)
  - Server functions (`analyzeGold`, news, prices)
  - Routes, auth, navigation

## Design changes

1. **Page frame** — wrap in the same white "terminal" shell used on the homepage section:
   - Outer card: white bg, hairline border `border-zinc-100`, rounded-2xl, subtle shadow.
   - Top status bar: left = `JENVU AI // SYSTEM_ACTIVE` with green pulse dot; right = `LIVE FEED · LATENCY · 14MS` in JetBrains Mono uppercase tracking-wider.

2. **Layout** — 12-col grid on `lg+`, stacked on mobile:
   ```text
   ┌─────────────────────────────────────────────────────┐
   │  status bar (symbol · timeframe · session · price)  │
   ├──────────────────────────────┬──────────────────────┤
   │  HTF chart  (1H)             │  Intelligence panel  │
   │                              │   - Bias / Direction │
   │                              │   - Entry / SL / TP  │
   ├──────────────────────────────┤   - RR / Confidence  │
   │  LTF chart  (15m)            │   - Session          │
   │                              ├──────────────────────┤
   │                              │  Narration feed      │
   │                              │  (timestamped lines, │
   │                              │   ICT-style chips:   │
   │                              │   FVG / OB / BOS /   │
   │                              │   SWEEP / CHoCH)     │
   └──────────────────────────────┴──────────────────────┘
   │  composer pill (mic + text)  +  footer mono strip   │
   ```

3. **Panels** — each block becomes a labeled terminal card:
   - Header row: tiny uppercase mono label + faint hairline divider.
   - Body: white bg, zinc-900 text, emerald/red accents only on direction & deltas.
   - Chart containers: thin border, rounded-xl, label badge top-left (`HTF // 1H`, `LTF // 15M`).

4. **Narration feed** — restyle the existing AI narration log as the "ICT Execution Feed":
   - Rows: `SYMBOL  HH:MM:SS  [CHIP]  message`
   - Chips colored by tag (FVG=violet, OB=blue, BOS=emerald, SWEEP=amber, CHoCH=rose).
   - Auto-scroll to newest, same data source as today.

5. **Composer** — replace current input with the rounded white pill used on `/app` (mic button + text + send arrow).

6. **Typography & tokens** — JetBrains Mono for labels/timestamps, Inter for body; only semantic zinc / emerald / red / amber utilities, no new colors.

7. **Mobile** — single column, charts full-width, intelligence + feed stack below; composer sticky at bottom.

## Out of scope

- No new data, no new indicators, no chart-library swap.
- No backend changes.
- No theme toggle / dark mode rework on this page (stays white terminal like the reference).

## Acceptance

- `/signal?symbol=...` still loads, charts render, AI still narrates and speaks, signals still appear.
- Visual matches the homepage terminal block (same status bar, same panel chrome, same mono labels, same feed row format).
- No regressions on mobile width (320–414px).
