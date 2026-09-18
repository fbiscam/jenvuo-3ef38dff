# Complete Extension Accuracy and Chat Routing

## Goal
Make ordinary messages behave like a concise AI chat, and only produce a structured XAU/USD trade plan when the user clearly asks for actionable analysis. Tighten the signal path so uncertain or stale setups return **NO TRADE** rather than an unsafe recommendation.

## Changes
1. **Resolve the reported TypeScript failure**
   - Keep `cn()` explicitly string-returning.
   - Search for duplicate/stale `utils.ts` sources and verify the current project with the TypeScript checker.

2. **Separate chat from trade analysis more strictly**
   - Centralize intent rules so the extension and server cannot drift apart.
   - Treat greetings, acknowledgements, educational questions, and ambiguous trading questions as normal conversation.
   - Require an explicit chart/screen analysis command or a clearly actionable request for signal, direction, entry, stop, or targets before showing a trade plan.

3. **Raise the signal safety threshold**
   - Require strong deterministic ICT/SMC confluence before any executable BUY/SELL result.
   - Treat fallback candle data without a verifiably recent timestamp as unverified, not fresh.
   - Re-check live price after AI review so a slow response cannot return an already-stale entry.
   - Keep hard vetoes authoritative; review failures, stale data, weak evidence, invalid levels, or already-hit stop/target return **NO TRADE**.
   - Preserve mandatory independent senior review for plans that include it.

4. **Finish outstanding consistency work**
   - Replace old fixed per-request pricing text with actual token-based billing at $3 per 1M tokens.
   - Rebuild the extension package with a new version and update the download page.

## Verification
- Run intent tests covering greetings, normal questions, education, ambiguous requests, and explicit trade-plan requests.
- Run deterministic safety tests for stale/unverified quotes, weak confluence, price drift, stop-hit, and target-hit cases.
- Run TypeScript, extension JavaScript, and manifest checks.
- Inspect the rebuilt ZIP version and confirm the public download responds successfully.

## Important limitation
No signal can be guaranteed accurate or profitable. The implementation will prioritize selectivity and capital preservation: uncertain setups are rejected instead of being presented as trades.
