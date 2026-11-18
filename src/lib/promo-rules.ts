/**
 * Promo codes only add free API credit to the wallet. They never discount,
 * pay for or add bonus to a plan purchase.
 */
export type PromoType = "free" | "discount" | "percent" | "fixed" | string | null | undefined;

export const PROMO_ONLY_CREDIT_MESSAGE = "Promo codes add API credit only and can't be used on plans.";

/** Only free-credit codes can be redeemed. */
export function promoRedeemable(type: PromoType): boolean {
  return type === "free";
}

/** Plan orders never carry a promo code, whatever the browser sends. */
export function promoCodeForOrder(_code: string | null | undefined): null {
  return null;
}
