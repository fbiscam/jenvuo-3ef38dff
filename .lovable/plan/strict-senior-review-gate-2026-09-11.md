# Strict Senior Review Gate

## Changes
- Keep Claude Opus 4.8 as the first senior reviewer.
- Add Tukenku Grok 4.6 as its direct fallback; Unikey currently lists Grok 4.3 only, not 4.6.
- Validate senior output so search-style, empty, or malformed replies are rejected and the fallback is tried.
- Enforce a hard gate: never return the primary analysis unless a valid senior review completes.
- Preserve token billing for both the primary call and the successful senior-review call.

## Verification
- Live-test Claude rejection/fallback behavior and confirm no unreviewed analysis is returned.
- Run TypeScript and extension script checks; confirm the reported `utils.ts` diagnostic is absent.
