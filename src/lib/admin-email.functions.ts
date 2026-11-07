import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminEmailInput, type EmailBox } from "./admin-email";

export type SentEmail = {
  id: string;
  from_box: EmailBox;
  to_email: string;
  subject: string;
  body: string;
  status: string;
  error: string | null;
  created_at: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { isAdminOrOpsUnlocked } = await import("@/lib/admin-guard.server");
  if (!(await isAdminOrOpsUnlocked(supabase, userId))) throw new Error("Forbidden: admin access required");
}

export const sendAdminEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminEmailInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    await assertAdmin(context.supabase, context.userId);
    const { boxSender } = await import("./admin-email");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sender = boxSender(data.box);
    const id = crypto.randomUUID();

    let status = "sent";
    let error: string | null = null;
    try {
      const r = await sendTemplateEmail("admin-message", data.to, {
        templateData: { subject: data.subject, body: data.body, boxLabel: sender.label, replyAddress: sender.replyTo },
        idempotencyKey: `admin-message-${id}`,
        replyTo: sender.replyTo,
        from: sender.from,
      });
      if (!r.sent) {
        status = "blocked";
        error = "This person unsubscribed or their address bounced before, so the email was not sent.";
      }
    } catch (e: any) {
      status = "failed";
      error = e?.status === 429 ? "Too many emails right now — try again in a minute." : "The email could not be sent. Please try again.";
      console.error("[admin-email] send failed", e?.code, e?.status, e?.message);
    }

    await supabaseAdmin.from("admin_sent_emails").insert({
      id,
      sent_by: context.userId,
      from_box: data.box,
      to_email: data.to,
      subject: data.subject,
      body: data.body,
      status,
      error,
      contact_message_id: data.contactMessageId ?? null,
    });

    if (status === "sent" && data.contactMessageId) {
      await supabaseAdmin.from("contact_messages").update({ status: "replied" }).eq("id", data.contactMessageId);
    }
    return { ok: status === "sent", message: status === "sent" ? `Sent to ${data.to}` : (error ?? "Not sent") };
  });

export const listSentEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SentEmail[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_sent_emails")
      .select("id,from_box,to_email,subject,body,status,error,created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (data ?? []) as SentEmail[];
  });
