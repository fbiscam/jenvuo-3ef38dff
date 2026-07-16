import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const ApplyInput = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  country: z.string().trim().max(60).optional().default(""),
  broker: z.string().trim().max(80).optional().default(""),
  experience_years: z.coerce.number().int().min(0).max(80).optional(),
  monthly_volume_usd: z.coerce.number().min(0).max(1_000_000_000).optional(),
  why_joining: z.string().trim().min(10).max(1500),
  myfxbook_url: z.string().trim().max(300).optional().default(""),
  requested_plan: z.enum(["free", "pro", "elite", "ultra"]).default("elite"),
});

export type FoundingApplication = {
  id: string;
  full_name: string;
  email: string;
  country: string | null;
  broker: string | null;
  experience_years: number | null;
  monthly_volume_usd: number | null;
  why_joining: string | null;
  myfxbook_url: string | null;
  status: string;
  seat_month: string | null;
  admin_notes: string | null;
  approved_at: string | null;
  first_profit_at: string | null;
  created_at: string;
  requested_plan?: string | null;
};

const SUPPORT_INBOX = "support@jenvu.net";
const FROM_ADDRESS = "Jenvu Founding <founding@notify.jenvu.net>";
const SENDER_DOMAIN = "notify.jenvu.net";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const submitFoundingApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ApplyInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const url = process.env.SUPABASE_URL;
    const pub = process.env.SUPABASE_PUBLISHABLE_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !pub) return { ok: false, error: "Server not configured." };

    const supabase = createClient<Database>(url, pub, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from("founding_applications" as any).insert({
      full_name: data.full_name,
      email: data.email.toLowerCase(),
      country: data.country || null,
      broker: data.broker || null,
      experience_years: data.experience_years ?? null,
      monthly_volume_usd: data.monthly_volume_usd ?? null,
      why_joining: data.why_joining,
      myfxbook_url: data.myfxbook_url || null,
      requested_plan: data.requested_plan,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return { ok: false, error: "You've already applied. We'll be in touch." };
      }
      console.error("[founding] insert failed:", error.message);
      return { ok: false, error: "Could not submit. Please try again." };
    }

    if (service) {
      try {
        const admin = createClient<Database>(url, service, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const safe = {
          n: escapeHtml(data.full_name),
          e: escapeHtml(data.email),
          c: escapeHtml(data.country || "—"),
          b: escapeHtml(data.broker || "—"),
          y: String(data.experience_years ?? "—"),
          v: String(data.monthly_volume_usd ?? "—"),
          w: escapeHtml(data.why_joining).replace(/\n/g, "<br/>"),
          m: escapeHtml(data.myfxbook_url || "—"),
        };
        const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#fff;color:#111;padding:24px">
          <div style="max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280">New founding application</div>
            <h1 style="font-size:20px;margin:8px 0 16px">${safe.n}</h1>
            <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:16px">
              <tr><td style="color:#6b7280;padding:4px 0;width:140px">Email</td><td>${safe.e}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0">Requested plan</td><td><strong>${escapeHtml(data.requested_plan.toUpperCase())}</strong></td></tr>
              <tr><td style="color:#6b7280;padding:4px 0">Country</td><td>${safe.c}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0">Broker</td><td>${safe.b}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0">Experience</td><td>${safe.y} yrs</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0">Monthly volume</td><td>$${safe.v}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0">MyFxBook</td><td>${safe.m}</td></tr>
            </table>
            <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;border-top:1px solid #e5e7eb;padding-top:16px">${safe.w}</div>
            <p style="font-size:12px;color:#6b7280;margin-top:24px">Review in the Founding admin panel.</p>
          </div></body></html>`;
        const text = `New founding application\n\n${data.full_name} <${data.email}>\nRequested plan: ${data.requested_plan.toUpperCase()}\nCountry: ${data.country || "—"}\nBroker: ${data.broker || "—"}\nExperience: ${data.experience_years ?? "—"} yrs\nMonthly volume: $${data.monthly_volume_usd ?? "—"}\nMyFxBook: ${data.myfxbook_url || "—"}\n\n${data.why_joining}`;
        const messageId = crypto.randomUUID();
        await admin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "founding-application",
          recipient_email: SUPPORT_INBOX,
          status: "pending",
        });
        await admin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: SUPPORT_INBOX,
            from: FROM_ADDRESS,
            sender_domain: SENDER_DOMAIN,
            subject: `[Founding] ${data.full_name} — ${data.requested_plan.toUpperCase()}`,
            html,
            text,
            reply_to: data.email,
            purpose: "transactional",
            label: "founding-application",
            idempotency_key: `founding-${messageId}`,
            queued_at: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.error("[founding] notify failed:", (e as Error)?.message);
      }
    }

    return { ok: true };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden: admin access required");
}

export const listFoundingApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FoundingApplication[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("founding_applications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FoundingApplication[];
  });

export const updateFoundingApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "approved", "rejected", "waitlisted", "active", "graduated"]).optional(),
      admin_notes: z.string().max(2000).optional(),
      first_profit_reached: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.status) {
      patch.status = data.status;
      if (data.status === "approved") patch.approved_at = new Date().toISOString();
    }
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    if (data.first_profit_reached) patch.first_profit_at = new Date().toISOString();
    const { error } = await context.supabase
      .from("founding_applications" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const foundingStats = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL;
  const pub = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !pub) return { seatsFilled: 0, seatsTotal: 100 };
  const supa = createClient<Database>(url, pub, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const monthKey = new Date().toISOString().slice(0, 7);
  const { count } = await supa
    .from("founding_applications" as any)
    .select("id", { count: "exact", head: true })
    .in("status", ["approved", "active"])
    .eq("seat_month", monthKey);
  return { seatsFilled: count ?? 0, seatsTotal: 100, monthKey };
});
