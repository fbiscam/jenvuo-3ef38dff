## Goal
Wrap `/app` (voice agent) with the same chrome as homepage `/` — header (logo + AUTH_TERMINAL pill + live ticker) and footer — while keeping the voice agent UI, orb, signals, and all functionality untouched in the middle.

## Changes (single file: `src/routes/app.tsx`)

1. **Add header** (sticky, white, mono labels) matching homepage:
   - Left: `/favicon.png` + "JENVU AI" linking to `/`
   - Right: status pill `APP_TERMINAL // ONLINE` (green dot)
   - Ticker strip below using the same `useLiveTicker` logic (extract pricing fetch into a shared hook or copy the same effect from index.tsx)

2. **Add footer** matching homepage:
   - "JENVU AI · © year" left, `v1.0 // VOICE_EDITION` right

3. **Wrap existing voice-agent content** in `<main className="flex-1 min-h-0 ...">` so layout becomes `h-dvh flex flex-col` (header / main / footer). No scroll, fits viewport like `/auth`.

4. **Typography**: apply `font-['Inter']` to root and `font-['JetBrains_Mono']` to chrome labels — same constants as index/auth.

5. **Preserve everything else** in `/app`: orb, mic button, send composer, signal cards, news panel, theme toggle, logout — no functional changes.

## Technical notes
- Reuse the ticker pattern from `src/routes/index.tsx` (Binance + gold-api). To avoid duplication, extract `useLiveTicker` and `INITIAL_TICKER` into `src/hooks/useLiveTicker.ts` and import in both `index.tsx` and `app.tsx`.
- Match auth.tsx's compact chrome sizing (`py-3 sm:py-4`) so the voice area keeps maximum room.
- Dark-mode aware: homepage chrome is white-only; keep it white on `/app` even when user toggles dark theme for the voice surface — chrome stays consistent across routes.

## Out of scope
- No changes to voice agent logic, signal generation, or `/signal` route.
- No homepage hero/sections added to `/app`.