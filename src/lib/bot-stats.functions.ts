import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BotProfitStat = { profit: number; accounts: number; day: string | null };

/** Admins only: total JX Bot profit of the latest reported day across all accounts. */
export const getBotDailyProfit = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<BotProfitStat> => {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Not allowed");
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: latest } = await supabaseAdmin
      .from("mt5_bot_reports").select("day").order("day", { ascending: false }).limit(1).maybeSingle();
    const day = (latest?.day as string | undefined) ?? null;
    if (!day) return { profit: 0, accounts: 0, day: null };
    const { data } = await supabaseAdmin.from("mt5_bot_reports").select("today_profit").eq("day", day);
    const rows = data ?? [];
    const profit = rows.reduce((s, r) => s + (Number(r.today_profit) || 0), 0);
    return { profit: Math.round(profit * 100) / 100, accounts: rows.length, day };
  } catch {
    return { profit: 0, accounts: 0, day: null };
  }
});
