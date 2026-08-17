# Plan: Integrated Plan Upgrades in Payment Page

Add a "Plan Upgrades" section to the existing `/dashboard/pay` page, allowing users to select a plan (Pro, Elite, Ultra) and generate a crypto payment order for the exact amount.

## User-facing changes
- **Plan Selection UI**: Add a toggle or section in the `/dashboard/pay` page to switch between "Top up credits" and "Upgrade plan".
- **Plan Cards**: Display Pro ($15), Elite ($50), and Ultra ($100) with their features.
- **Direct Checkout**: Selecting a plan automatically sets the payment amount and highlights the goal.
- **Trial Awareness**: Show "End trial and upgrade" if the user is on a trial.

## Technical details
- **Schema Update**: Add a `target_plan_id` column to `payment_orders` to track what the payment is for (optional, as `applyPlanForPayment` already uses `pay_amount_usd` to decide, but explicit is better for tracking).
- **Core Logic**: Update `applyPlanForPayment` in `src/lib/payments/core.server.ts` to be more strict when a `target_plan_id` is present, but keep the current flexible "credit-based" logic as a fallback.
- **Frontend State**: Update `PayPage` in `src/routes/_authenticated/dashboard.pay.tsx` to handle plan selection state.

## Steps
1. **Migration**: Add `target_plan_id` (text, references plans.id) and `is_upgrade` (boolean) to `payment_orders`.
2. **Server Logic**: Update `createTopupOrder` function to accept `planId`.
3. **Core Server**: Update `approveOrder` to handle specific plan targets.
4. **UI Update**: Modify `src/routes/_authenticated/dashboard.pay.tsx` to include the plan selection interface.
