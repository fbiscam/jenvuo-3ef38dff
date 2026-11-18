import type { PaidPlanId } from "@/lib/plan-features";

/**
 * JX Bot seats: the first 50 people each calendar month (UTC) who buy a paid plan get JX Bot
 * with it. After that, plans sell without the bot until seats reopen on the 1st.
 * People who already hold the bot keep it when they renew or switch plans (no new seat).
 */
export const BOT_SEATS_PER_MONTH = 50;

/** Plan price with JX Bot (a seat) and without it (Terminal + API only), USD a month. */
export const PLAN_PRICE_WITH_BOT: Record<PaidPlanId, number> = { pro: 29, elite: 59, ultra: 99 };
export const PLAN_PRICE_NO_BOT: Record<PaidPlanId, number> = { pro: 19, elite: 39, ultra: 59 };

type BotSub = { plan_id: string | null; status: string | null; is_trial: boolean | null; bot_included?: boolean | null } | null | undefined;

/** Already holds the bot: an active, non-trial paid plan bought with JX Bot. */
export function holdsBotSeat(sub: BotSub): boolean {
  if (!sub || sub.is_trial || sub.status !== "active") return false;
  const id = String(sub.plan_id || "").toLowerCase();
  if (id !== "pro" && id !== "elite" && id !== "ultra") return false;
  return sub.bot_included !== false;
}

export function seatsLeft(taken: number, total = BOT_SEATS_PER_MONTH): number {
  return Math.max(0, total - Math.max(0, Math.floor(Number(taken) || 0)));
}

/**
 * What a plan purchase includes. Holders keep the bot without using a seat; everyone else
 * gets it only while seats are left, and then takes one.
 */
export function botOffer(input: { holder: boolean; taken: number; total?: number }): { withBot: boolean; newSeat: boolean } {
  if (input.holder) return { withBot: true, newSeat: false };
  const open = seatsLeft(input.taken, input.total) > 0;
  return { withBot: open, newSeat: open };
}

export function priceFor(plan: PaidPlanId, withBot: boolean): number {
  return (withBot ? PLAN_PRICE_WITH_BOT : PLAN_PRICE_NO_BOT)[plan];
}
