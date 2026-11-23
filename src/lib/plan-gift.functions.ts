// Ops-console server functions for plan promo codes (Pro / Elite / Ultra for N months).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GIFT_MONTHS, GIFT_PLANS } from "./plan-gift";

export type PlanGiftRow = {
  code: string;
  plan_id: string;
  months: number;
  recipient_email: string;
  note: string | null;
  status: string;
  expires_at: string | null;
  email_sent_at: string | null;
  redeemed_at: string | null;
  plan_ends_at: string | null;
  months_credited: number;
  created_at: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { isAdminOrOpsUnlocked } = await import("@/lib/admin-guard.server");
  if (!(await isAdminOrOpsUnlocked(supabase, userId))) throw new Error("Forbidden: admin access required");
}

async function sendGiftEmail(row: PlanGiftRow): Promise<{ sent: boolean; message: string }> {
  const { GIFT_PLAN_PERKS, isGiftPlan } = await import("./plan-gift");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const plan = isGiftPlan(row.plan_id) ? GIFT_PLAN_PERKS[row.plan_id] : { name: row.plan_id, perks: [] };
  try {
    const r = await sendTemplateEmail("plan-gift", row.recipient_email, {
      templateData: {
        planName: plan.name,
        months: row.months,
        code: row.code,
        perks: plan.perks,
        note: row.note ?? undefined,
        redeemBy: row.expires_at
          ? new Date(row.expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
          : undefined,
        redeemUrl: "https://dash.jenvu.com/billing",
      },
      idempotencyKey: `plan-gift-${row.code}-${Date.now()}`,
      from: { name: "Jenvu", local: "noreply" },
    });
    if (!r.sent) return { sent: false, message: "This address unsubscribed or bounced before, so the email was not sent. Copy the code instead." };
    return { sent: true, message: "Promo code emailed." };
  } catch (e: any) {
    console.error("[plan-gift] send failed", e?.code, e?.status, e?.message);
    return {
      sent: false,
      message: e?.status === 429 ? "Too many emails right now — try Resend in a minute." : "The code was created but the email could not be sent. Try Resend.",
    };
  }
}

export const opsListPlanGifts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanGiftRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("plan_gift_codes")
      .select("code,plan_id,months,recipient_email,note,status,expires_at,email_sent_at,redeemed_at,plan_ends_at,months_credited,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as PlanGiftRow[];
  });

const createInput = z.object({
  plan: z.enum(GIFT_PLANS as [string, ...string[]]),
  months: z.number().int().refine((m) => (GIFT_MONTHS as readonly number[]).includes(m), "Pick 1, 2, 5 or 12 months."),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254),
  note: z.string().trim().max(240).optional(),
  validDays: z.number().int().min(1).max(365).default(30),
  send: z.boolean().default(true),
});

export const opsCreatePlanGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { makeGiftCode, isGiftPlan, isGiftMonths } = await import("./plan-gift");
    if (!isGiftPlan(data.plan) || !isGiftMonths(data.months)) throw new Error("Invalid plan or months.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expires = new Date(Date.now() + data.validDays * 86_400_000).toISOString();
    let row: PlanGiftRow | null = null;
    for (let i = 0; i < 4 && !row; i++) {
      const code = makeGiftCode(data.plan, data.months, (n) => crypto.getRandomValues(new Uint8Array(n)));
      const { data: inserted, error } = await (supabaseAdmin as any)
        .from("plan_gift_codes")
        .insert({ code, plan_id: data.plan, months: data.months, recipient_email: data.email, note: data.note || null, expires_at: expires })
        .select("*")
        .single();
      if (!error) row = inserted as PlanGiftRow;
      else if (error.code !== "23505") throw new Error(error.message);
    }
    if (!row) throw new Error("Could not create a unique code. Try again.");
    if (!data.send) return { code: row.code, emailed: false, message: "Code created." };
    const r = await sendGiftEmail(row);
    if (r.sent) await (supabaseAdmin as any).from("plan_gift_codes").update({ email_sent_at: new Date().toISOString() }).eq("code", row.code);
    return { code: row.code, emailed: r.sent, message: r.message };
  });

export const opsResendPlanGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await (supabaseAdmin as any).from("plan_gift_codes").select("*").eq("code", data.code).maybeSingle();
    if (!row) throw new Error("Code not found.");
    if (row.status !== "active") throw new Error("Only active codes can be resent.");
    const r = await sendGiftEmail(row as PlanGiftRow);
    if (r.sent) await (supabaseAdmin as any).from("plan_gift_codes").update({ email_sent_at: new Date().toISOString() }).eq("code", data.code);
    return { emailed: r.sent, message: r.message };
  });

export const opsRevokePlanGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("plan_gift_codes").update({ status: "revoked" }).eq("code", data.code).eq("status", "active");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
