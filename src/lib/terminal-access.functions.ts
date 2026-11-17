import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Terminal access for the signed-in user: always open; the reason drives plan notices. */
export const getTerminalAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { checkTerminalAccess } = await import("@/lib/terminal-access.server");
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    return checkTerminalAccess(context.supabase as any, context.userId, email);
  });
