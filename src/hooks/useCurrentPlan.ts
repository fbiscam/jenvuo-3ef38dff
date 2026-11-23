import { useCredits } from "./useCredits";

export function useCurrentPlan() {
  // Header, Pricing and homepage must observe the same redeemed snapshot as Billing.
  const { plan } = useCredits();
  return plan?.id ?? null;
}
