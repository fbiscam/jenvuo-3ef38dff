// Client-callable system mail server function (for welcome mail after signup).
// Users can only trigger sends TO themselves.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendWelcomeSystemMail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fullName?: string }) => ({
    fullName: String(d?.fullName ?? "").slice(0, 120),
  }))
  .handler(async ({ context, data }) => {
    const { sendSystemMail } = await import("@/lib/system-mail.server");
    const firstName = data.fullName?.trim()?.split(/\s+/)[0] || "there";
    const subject = `Welcome to Jenvu, ${firstName} 👋`;
    const body = [
      `Hi ${firstName},`,
      ``,
      `Welcome to Jenvu — your account is ready.`,
      ``,
      `Here's what you can do next:`,
      `• Open the Terminal for live Gold, Bitcoin and EUR/USD charts`,
      `• Ask anything in Chat with 60+ AI models`,
      `• Verify your ID to open the Terminal, JX Bot and your plan's API credit (dash.jenvu.com/documents)`,
      `• Reply to this message any time — support@jenvu.email is monitored by our team`,
      ``,
      `— The Jenvu Team`,
    ].join("\n");
    await sendSystemMail({
      from: "support@jenvu.email",
      toUserId: context.userId,
      subject,
      body,
    });
    return { ok: true };
  });
