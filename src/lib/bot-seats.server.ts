import { BOT_SEATS_PER_MONTH, botOffer, holdsBotSeat, seatsLeft } from "@/lib/bot-seats";

/** Bot seats taken this UTC month (one per person; expired unpaid orders free theirs). */
export async function botSeatsTaken(db: any): Promise<number> {
  const { data, error } = await db.rpc("jx_bot_seats_taken");
  if (error) throw new Error("Could not read JX Bot seats.");
  return Math.max(0, Number(data) || 0);
}

/** What a plan bought now by this user includes: JX Bot (with or without a new seat) or not. */
export async function botOfferForUser(db: any, userId: string) {
  const [{ data: sub }, taken] = await Promise.all([
    db.from("user_subscriptions").select("plan_id,status,is_trial,bot_included").eq("user_id", userId).maybeSingle(),
    botSeatsTaken(db),
  ]);
  const holder = holdsBotSeat(sub ?? null);
  return { ...botOffer({ holder, taken }), holder, taken, left: seatsLeft(taken), total: BOT_SEATS_PER_MONTH };
}
