# Fix extension replies and repeated WAIT signals

## Changes
- Make simple chat fail fast when free UnoRouter models hang, then fall back to the existing external GPT-6 Astra route.
- Add a visible extension timeout so `Thinking...` cannot remain indefinitely.
- Skip live-market loading for ordinary greetings and general chat to improve response speed.
- Give senior review the same chart image and full verified market context used by primary analysis.
- Preserve a valid primary BUY/SELL when the reviewer only returns an unsupported `WAIT`; allow an explicit contradictory BUY/SELL or well-supported veto to replace it.
- Remove the contradictory secondary confirmation gate that converts otherwise valid engine setups to `WAIT`, while preserving existing scoring, risk, and completed senior-review requirements.

## Validation
- Test `Hi` end-to-end and confirm a visible reply or bounded error.
- Test a chart-analysis request and confirm image/context reaches both review passes.
- Verify SELL is not overwritten by an evidence-free `WAIT` and genuine incomplete setups still return `WAIT`.
- Run targeted checks and rebuild the extension package if its source changes.

## Technical details
- Keep all inference on existing UnoRouter and Browser Use providers; no Lovable AI credits.
- Do not weaken the rule that paid-plan trade plans require a completed senior review.
