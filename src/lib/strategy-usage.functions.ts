import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateStrategyAccess, type StrategyAccess } from "@/lib/strategy-access";

async function readAccess(context: { supabase: unknown; userId: string; claims?: unknown }, add: boolean): Promise<StrategyAccess> {
  const email = (context.claims as { email?: string } | undefined)?.email ?? null;
  const client = context.supabase as any;
  const { checkPlanAccess } = await import("@/lib/terminal-access.server");
  await client.rpc("expire_my_pro_trial");
  const [terminal, { data: sub }] = await Promise.all([
    checkPlanAccess(client, context.userId, email),
    client.from("user_subscriptions").select("plan_id").eq("user_id", context.userId).maybeSingle(),
  ]);
  const planId = (sub?.plan_id as string | null) ?? null;
  // Plans without a daily limit never write usage.
  const probe = evaluateStrategyAccess(terminal, planId, 0);
  if (probe.secondsLeft === null) return probe;
  const { data: used } = await client.rpc("tick_terminal_strategy_usage", { _add: add });
  return evaluateStrategyAccess(terminal, planId, Number(used ?? 0));
}

/**
 * Whether the chart strategies (Fresh sweep, Swing price action, Zone + FVG) are on, and
 * how much of today's plan time is left. Reading never adds time.
 */
export const getStrategyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StrategyAccess> => readAccess(context as any, false));

/**
 * Called about once a minute while the Terminal is open, visible and a paid indicator is
 * on: the server adds the real time since the last call (capped) and returns the answer.
 */
export const tickStrategyUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StrategyAccess> => readAccess(context as any, true));
