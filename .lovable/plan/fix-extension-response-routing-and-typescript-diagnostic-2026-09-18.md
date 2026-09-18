# Fix extension response routing and TypeScript diagnostic

## Goal
Make the extension answer ordinary questions normally and concisely, while reserving the structured trade-plan output for requests that genuinely need actionable XAU/USD levels. Resolve or conclusively eliminate the reported `src/lib/utils.ts` type error.

## Changes
- Split intent detection into normal conversation, general trading education/questions, and actionable XAU/USD analysis.
- Return concise plain text for trading concepts, explanations, and other questions that do not request a live setup.
- Run the live ICT/SMC analysis and show the entry/SL/TP trade plan only when the user requests a setup, signal, chart analysis, or actionable levels.
- Keep attached-chart analysis on the reviewed trade-analysis path.
- Preserve mandatory review, deterministic prices, safeguards, and token-based billing for actual analysis.
- Verify `cn()` in `src/lib/utils.ts` has an explicit string-safe result and run the project TypeScript check to catch the exact reported diagnostic.
- Repackage the browser extension only if its bundled files change.

## Verification
- Check representative prompts such as “what is an order block?” return plain text.
- Check “analyze gold and give entry, SL and TP” returns the compact trade plan.
- Run the TypeScript checker and confirm the `utils.ts(8,7)` error is absent.
