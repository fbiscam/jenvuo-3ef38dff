# Fix extension chat intent

## What will change
- Treat greetings, acknowledgements, and ordinary questions as normal AI chat, even while a screen or image is shared.
- Start the structured ICT/SMC trade-plan flow only when the user explicitly requests actionable analysis, a signal, entry/SL/TP, or a chart review.
- Keep shared-screen images available as context for normal answers without forcing a trade plan.
- Rebuild and publish a new extension ZIP on the Extension page.

## Verification
- Test intent classification with `Hi`, `Ok`, ordinary questions, educational trading questions, and explicit trade-plan requests.
- Run the project type check and extension syntax checks, confirming the reported `utils.ts` diagnostic is absent.
- Inspect the rebuilt ZIP to confirm its new version and files.

## Technical details
- Align client and server intent routing so image presence alone never selects structured analysis.
- Preserve existing ICT/SMC validation and senior-review safeguards for explicit analysis requests.
