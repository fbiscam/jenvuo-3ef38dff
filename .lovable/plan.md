# Extension API Usage and Plan Billing

## Goal
Make the browser extension behave like a metered AI API: every AI analysis is authenticated, checked against the user’s plan and balance, recorded by model, and visible in Usage. Market snapshots and key verification remain free.

## Plan rules

| Plan | Active extension keys | Monthly AI wallet | Extension models |
|---|---:|---:|---|
| Pro | 1 | $10 | GPT/Gemini primary + senior review |
| Elite | 3 | $40 | GPT/Gemini primary + senior review |
| Ultra | 5 | $90 | GPT/Gemini primary + senior review |

Free/inactive accounts cannot create or use extension API keys. Existing keys above a downgraded plan’s limit remain visible, but only the newest allowed active keys work until extras are revoked.

## Charging model
- Free operations: API-key verification, live price snapshots, candles, indicators, and chart overlays.
- Paid operations: extension chat, screen/chart analysis, and full market analysis.
- Each paid request uses hybrid pricing: a small fixed analysis fee plus the actual token cost of both the primary GPT/Gemini call and mandatory senior-review call, multiplied by the existing plan markup.
- Use a $0.02 base fee per completed AI analysis. Failed requests are not charged; each request is idempotent so retries cannot double-charge.
- Check available balance before starting AI. If insufficient, return a clear low-balance response and show it in the extension/account.

## Backend and data
- Add plan-level extension key limits and set monthly wallets to $10/$40/$90 in a database migration.
- Add extension request identity and usage metadata to billing records: API key ID/name, request ID, action, model, senior model, token counts, raw model cost, base fee, markup, and final charge.
- Add a secure, atomic extension-charge function so balance deduction and ledger recording happen together.
- Enforce plan status, key allowance, and available balance from the server on every extension AI request.
- Make senior review mandatory for every paid extension analysis, not only chart/trading-keyword requests.

## App updates
- Extension page: show current plan, active-key allowance, wallet balance, and disabled create state when the limit is reached.
- Usage page: add “Extension API” as a request category and show primary/senior models, tokens, request count, and charged amount in model/activity views.
- Pricing page: update Pro/Elite/Ultra wallet amounts and API-key limits, explain free market data versus charged AI analysis, and state that senior review is included on every analysis.
- Billing copy: replace the signal-only flat-fee wording with the new extension hybrid-pricing explanation without changing unrelated billing behavior.

## Validation
- Verify key creation limits for Pro, Elite, and Ultra.
- Verify snapshots are free and AI analysis creates exactly one ledger charge containing both models.
- Verify insufficient balance blocks AI before model calls and returns a useful low-balance message.
- Verify Usage model filtering and pricing comparison on desktop and mobile.
- Run the TypeScript checks and confirm the existing six-line `src/lib/utils.ts` has no active line-8 error.
