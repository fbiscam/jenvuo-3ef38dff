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
