import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Whether the signed-in user may open the Terminal (approved Founding members + admins). */
export const getTerminalAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { checkTerminalAccess } = await import("@/lib/terminal-access.server");
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    return checkTerminalAccess(context.supabase as any, context.userId, email);
  });
