# Add Evolink AI provider

## Goal
Connect the securely saved Evolink key to the extension’s AI model routing, verify which Evolink models actually work, and keep the existing primary/senior-review safety rules intact.

## What will change
- Add Evolink as a server-only AI provider using its OpenAI-compatible API and the saved `EVOLINK_API_KEY`.
- Fetch and test Evolink’s live model list, including GPT-6 Astra and suitable high-quality alternatives.
- Put only successfully tested models into the extension chains.
- Keep normal conversation separate from chart analysis.
- Preserve plan behavior: Pro receives primary analysis; Elite and Ultra require a completed senior second review before any signal is shown.
- Add model names and token rates to usage/billing records only where an authoritative Evolink rate is available; otherwise avoid inventing prices.
- Surface Evolink authentication, balance, rate-limit, and provider errors clearly without exposing the key.

## Validation
- Run a real Evolink models request and at least one real completion through the implemented server path.
- Confirm primary routing and the mandatory senior-review gate.
- Run TypeScript and extension JavaScript checks.

## Technical details
- Changes stay in the existing shared AI routing and cost-label modules.
- The API key remains server-side and encrypted.
- No unrelated pricing-page or extension-layout changes are included.
