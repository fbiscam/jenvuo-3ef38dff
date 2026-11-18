import type { PaidPlanId } from "@/lib/plan-features";

/**
 * JX Bot comes with every paid plan: there is no monthly seat limit any more, so every
 * paid buyer gets the bot. One price set for everyone.
 */

/** Plan price, USD a month (JX Bot + Terminal + API credit). */
export const PLAN_PRICE: Record<PaidPlanId, number> = { pro: 69, elite: 139, ultra: 239 };
/** Kept for older callers: with and without the bot are the same price now. */
export const PLAN_PRICE_WITH_BOT = PLAN_PRICE;
export const PLAN_PRICE_NO_BOT = PLAN_PRICE;

type BotSub = { plan_id: string | null; status: string | null; is_trial: boolean | null; bot_included?: boolean | null } | null | undefined;

/** Already holds the bot: an active, non-trial paid plan. */
export function holdsBotSeat(sub: BotSub): boolean {
  if (!sub || sub.is_trial || sub.status !== "active") return false;
  const id = String(sub.plan_id || "").toLowerCase();
  return id === "pro" || id === "elite" || id === "ultra";
}

/** Every plan purchase includes JX Bot. */
export function botOffer(_input?: { holder?: boolean }): { withBot: true; newSeat: false } {
  return { withBot: true, newSeat: false };
}

export function priceFor(plan: PaidPlanId, _withBot = true): number {
  return PLAN_PRICE[plan];
}
