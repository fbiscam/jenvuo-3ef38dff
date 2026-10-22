/** Credit-ledger reasons that count as a gift to the account (shown in the top-bar Gifts box). */
export const GIFT_REASONS = [
  "admin_grant",
  "promo_bonus",
  "pro_trial_grant",
  "referral_reward",
  "founding_referral_reward",
] as const;

export type GiftReason = (typeof GIFT_REASONS)[number];

export function isGiftReason(reason: string): reason is GiftReason {
  return (GIFT_REASONS as readonly string[]).includes(reason);
}

export function giftTitle(reason: string): string {
  switch (reason) {
    case "admin_grant":
      return "Jenvu team gift";
    case "promo_bonus":
      return "Bonus credit";
    case "pro_trial_grant":
      return "Free trial credit";
    case "referral_reward":
    case "founding_referral_reward":
      return "Referral reward";
    default:
      return "Gift";
  }
}

/** Number of gifts received after the last time the user opened the Gifts box. */
export function countUnseenGifts(gifts: { created_at: string }[], seenAt: string | null): number {
  if (!seenAt) return gifts.length;
  const t = new Date(seenAt).getTime();
  return gifts.filter((g) => new Date(g.created_at).getTime() > t).length;
}
