import { looksLikeGiftCode, normalizeGiftCode } from "./plan-gift";

/** Credit promos and email-locked plan gifts redeem separately from paid orders. */
export type PromoType = "free" | "discount" | "percent" | "fixed" | string | null | undefined;

export const PROMO_ONLY_CREDIT_MESSAGE = "This code is not a redeemable API-credit or plan promo code.";

/** Redemption is not a purchase: neither branch needs the credit top-up gate. */
export async function redeemPromoCode<TGift, TCredit>(
  code: string,
  handlers: { gift: (code: string) => Promise<TGift>; credit: (code: string) => Promise<TCredit> },
): Promise<TGift | TCredit> {
  return looksLikeGiftCode(code)
    ? handlers.gift(normalizeGiftCode(code))
    : handlers.credit(code.trim());
}

/** Only free-credit codes can be redeemed. */
export function promoRedeemable(type: PromoType): boolean {
  return type === "free";
}

/** Plan orders never carry a promo code, whatever the browser sends. */
export function promoCodeForOrder(_code: string | null | undefined): null {
  return null;
}
