import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Terminal access for the signed-in user: always open; the reason drives plan notices. */
export const getTerminalAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { checkTerminalAccess } = await import("@/lib/terminal-access.server");
    const { verifiedEmailFor } = await import("@/lib/verified-email");
    const { data } = await (context.supabase as any).auth.getUser();
    const email = verifiedEmailFor(data?.user, context.userId);
    return checkTerminalAccess(context.supabase as any, context.userId, email);
  });
