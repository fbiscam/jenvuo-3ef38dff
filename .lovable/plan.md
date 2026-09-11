# Billing buttons and plan cancellation

## What will change
- Keep **Buy credits** linked to the existing payment page and open its credit top-up view directly.
- Replace the current **Cancel plan** link with a confirmation dialog.
- Clearly warn that cancellation permanently removes the current credit balance and paid-plan features.
- Provide **Keep plan** and **Cancel plan permanently** choices, with a loading state and success/error feedback.
- On final confirmation, securely verify the signed-in user, switch the account to Free/cancelled, zero remaining credits, expire credit lots, and record the removal in billing history.
- Refresh the displayed plan and balance immediately after success.

## Technical details
- Add one authenticated server action for cancellation.
- Add one atomic database function so plan, wallet, credit lots, and billing-history changes cannot partially complete.
- Reuse the existing alert-dialog and button styles.
- Verify the billing flow on desktop and mobile, and run the TypeScript check. The reported `src/lib/utils.ts:8` diagnostic is stale because that file currently has only six valid lines; validation will confirm the current result.
