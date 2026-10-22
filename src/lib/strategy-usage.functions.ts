import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateStrategyAccess, type StrategyAccess } from "@/lib/strategy-access";

/**
 * Whether the chart strategies (Fresh sweep, Swing price action, Zone + FVG)
 * are unlocked. They come with Terminal access (plan or Pro trial) and take
 * no credits.
 */
export const getStrategyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StrategyAccess> => {
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    const { checkTerminalAccess } = await import("@/lib/terminal-access.server");
    await (context.supabase as any).rpc("expire_my_pro_trial");
    const terminal = await checkTerminalAccess(context.supabase as any, context.userId, email);
    return evaluateStrategyAccess(terminal);
  });

/**
 * Kept for Terminal tabs still running the previous version: same access
 * answer, never charges (the hourly fee was removed).
 */
export const tickStrategyUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { charge?: boolean } | undefined) => ({ charge: Boolean(input?.charge) }))
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    const { checkTerminalAccess } = await import("@/lib/terminal-access.server");
    const terminal = await checkTerminalAccess(context.supabase as any, context.userId, email);
    return { ...evaluateStrategyAccess(terminal), balance: 0, fee: 0, charged: false };
  });
