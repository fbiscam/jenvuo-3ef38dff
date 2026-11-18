import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BOT_SEATS_PER_MONTH, seatsLeft } from "@/lib/bot-seats";
import { nextSeatOpening } from "@/lib/founding-seats";

export type BotSeatStatus = { taken: number; left: number; total: number; nextOpenAt: string };

/** Public: how many of this month's 50 JX Bot seats are left (a count only, never who). */
export const getBotSeatStatus = createServerFn({ method: "GET" }).handler(async (): Promise<BotSeatStatus> => {
  const base = { total: BOT_SEATS_PER_MONTH, nextOpenAt: nextSeatOpening().toISOString() };
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ...base, taken: 0, left: BOT_SEATS_PER_MONTH };
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("jx_bot_seats_taken" as never);
  const taken = error ? 0 : Math.max(0, Number(data) || 0);
  return { ...base, taken, left: seatsLeft(taken) };
});

export type MyBotOffer = BotSeatStatus & { withBot: boolean; holder: boolean };

/** Signed in: whether a plan bought now comes with JX Bot (seat open or already a bot holder). */
export const getMyBotOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyBotOffer> => {
    const { botOfferForUser } = await import("@/lib/bot-seats.server");
    const o = await botOfferForUser(context.supabase, context.userId);
    return { taken: o.taken, left: o.left, total: o.total, nextOpenAt: nextSeatOpening().toISOString(), withBot: o.withBot, holder: o.holder };
  });
