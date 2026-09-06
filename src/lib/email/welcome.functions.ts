// Client-callable welcome email. Authenticated users can only trigger a send
// to their own account address.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fullName?: string; siteUrl?: string }) => ({
    fullName: String(d?.fullName ?? "").slice(0, 120),
    siteUrl: String(d?.siteUrl ?? "https://jenvu.com").slice(0, 200),
  }))
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const { logEmailSend } = await import("@/lib/email/managed.server");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const to = (userRes.user?.email ?? "").toLowerCase().trim();
    if (!to) return { ok: false };

    try {
      const result = await sendTemplateEmail("welcome", to, {
        templateData: { fullName: data.fullName, siteUrl: data.siteUrl },
        idempotencyKey: `welcome-${to}`,
      });
      await logEmailSend(supabaseAdmin, {
        templateName: "welcome",
        recipientEmail: to,
        status: result.sent ? "sent" : "suppressed",
      });
      return { ok: result.sent };
    } catch (error) {
      await logEmailSend(supabaseAdmin, {
        templateName: "welcome",
        recipientEmail: to,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "send_failed",
      });
      return { ok: false };
    }
  });
