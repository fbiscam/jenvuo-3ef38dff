# Stabilize extension gold signals

## Goal
Make chart analysis use the attached/shared chart, produce a consistent actionable BUY/SELL or conditional setup when evidence supports one, and reserve WAIT for genuine invalidation.

## Changes
- Send the uploaded or shared chart image into the verified vision-capable primary analysis models instead of analyzing market data alone.
- Separate hard vetoes from ordinary warnings in the deterministic ICT/SMC desk so one weak factor does not automatically erase an otherwise valid setup.
- Tighten primary and senior review instructions: preserve computed levels, distinguish confirmed entries from pending limit setups, and use WAIT only for explicit hard failures.
- Report senior-review status accurately instead of labelling every non-empty review as confirmed.
- Rebuild the extension package and verify TypeScript, package contents, and the request path.

## Technical details
- Keep XAU/USD-only enforcement, minimum risk/reward, provider fallbacks, plan gating, and safety language unchanged.
- The reported `src/lib/utils.ts` error is stale: the file has six valid lines and the project typecheck currently passes.
