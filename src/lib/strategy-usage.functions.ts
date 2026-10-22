import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  STRATEGY_HOURLY_FEE_USD,
  evaluateStrategyAccess,
  strategyHourKey,
  type StrategyAccessReason,
} from "@/lib/strategy-access";

export type StrategyUsageState = {
  allowed: boolean;
  reason: StrategyAccessReason;
  balance: number;
  fee: number;
  /** True when this call took the $0.10 for the current hour. */
  charged: boolean;
};

/**
 * Checks whether the chart strategies (Fresh sweep, Swing price action,
 * Zone + FVG) are unlocked and, when `charge` is true, takes the hourly fee
 * once per UTC hour. Called by the Terminal while any of them is switched on.
 */
export const tickStrategyUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { charge?: boolean }) => ({ charge: Boolean(input?.charge) }))
  .handler(async ({ data, context }): Promise<StrategyUsageState> => {
    const { userId } = context;
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { checkTerminalAccess } = await import("@/lib/terminal-access.server");

    await (context.supabase as any).rpc("expire_my_pro_trial");

    const [terminal, { data: sub }, { data: bal }] = await Promise.all([
      checkTerminalAccess(context.supabase as any, userId, email),
      (supabaseAdmin as any)
        .from("user_subscriptions")
        .select("plan_id, status, is_trial, current_period_end, trial_ends_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin.from("credit_balances").select("balance").eq("user_id", userId).maybeSingle(),
    ]);
    const balance = Number(bal?.balance ?? 0);
    const access = evaluateStrategyAccess({
      isAdmin: terminal.reason === "admin",
      isFounding: terminal.reason === "founding" && terminal.allowed,
      sub: sub ?? null,
      balance,
    });
    const base = { ...access, balance, fee: STRATEGY_HOURLY_FEE_USD, charged: false };
    if (!access.allowed || access.reason === "admin" || !data.charge) return base;

    const hour = strategyHourKey();
    const { data: dupe } = await supabaseAdmin
      .from("credit_ledger")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "chart_strategy_hour")
      .contains("metadata", { hour })
      .limit(1)
      .maybeSingle();
    if (dupe?.id) return base;

    const { data: after, error } = await supabaseAdmin.rpc("spend_credits", {
      _user_id: userId,
      _amount: STRATEGY_HOURLY_FEE_USD as any,
      _reason: "chart_strategy_hour",
      _metadata: { stage: "chart_strategy", hour, charge_usd: STRATEGY_HOURLY_FEE_USD } as any,
    });
    if (error) {
      return { ...base, allowed: false, reason: "no_credit" };
    }
    return { ...base, balance: Number(after ?? balance - STRATEGY_HOURLY_FEE_USD), charged: true };
  });
