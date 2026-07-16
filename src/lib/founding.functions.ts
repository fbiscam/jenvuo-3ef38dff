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
  referrer_email: z.string().trim().email().max(255).optional().or(z.literal("")),
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
const APP_URL = "https://jenvu.com";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function getOrCreateUnsubToken(admin: any, email: string): Promise<string> {
  const normalized = email.toLowerCase();
  const { data: existing } = await admin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();
  if (existing?.token && !existing.used_at) return existing.token as string;
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  await admin
    .from("email_unsubscribe_tokens")
    .upsert({ token, email: normalized }, { onConflict: "email", ignoreDuplicates: true });
  const { data: stored } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  return (stored?.token as string) ?? token;
}

const PLAN_META: Record<string, { label: string; wallet: string; blurb: string }> = {
  free: { label: "Free", wallet: "$2 starting credit", blurb: "Try the platform on XAU/USD. Upgrade any time." },
  pro: { label: "Pro", wallet: "$15 wallet credit", blurb: "Multi-pair scans, realtime alerts, full trade management." },
  elite: { label: "Elite", wallet: "$50 wallet credit", blurb: "Everything in Pro plus priority AI models & higher scan budget." },
  ultra: { label: "Ultra", wallet: "$100 wallet credit", blurb: "Top-tier access. Every model, every pair, no throttling." },
};

type ApplicantEmailKind = "received" | "approved" | "rejected" | "waitlisted";

function renderApplicantEmail(kind: ApplicantEmailKind, name: string, plan: string) {
  const meta = PLAN_META[plan] || PLAN_META.elite;
  const wrap = (title: string, tag: string, body: string, cta?: { label: string; href: string }) => `<!doctype html><html><body style="margin:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#18181b;padding:24px 12px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:20px;overflow:hidden">
      <div style="padding:28px 32px 8px">
        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#71717a">${escapeHtml(tag)}</div>
        <h1 style="font-size:24px;line-height:1.2;margin:8px 0 0;color:#09090b">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:16px 32px 8px;font-size:15px;line-height:1.6;color:#3f3f46">${body}</div>
      ${cta ? `<div style="padding:16px 32px 28px"><a href="${cta.href}" style="display:inline-block;background:#09090b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600;font-size:14px">${escapeHtml(cta.label)}</a></div>` : `<div style="height:16px"></div>`}
      <div style="border-top:1px solid #f4f4f5;padding:16px 32px 24px;font-size:12px;color:#a1a1aa">
        Jenvu · Institutional-grade XAU intelligence · <a href="${APP_URL}" style="color:#71717a;text-decoration:underline">jenvu.com</a>
      </div>
    </div></body></html>`;

  const n = escapeHtml(name);
  switch (kind) {
    case "received":
      return {
        subject: "We received your Founding Trader application",
        html: wrap(
          `Thanks, ${n} — application received`,
          "Founding Trader Program",
          `<p style="margin:0 0 12px">We got your application for the <strong>${escapeHtml(meta.label)}</strong> tier. Every application is reviewed manually within <strong>48 hours</strong>.</p>
           <p style="margin:0 0 12px">If approved, you'll get:</p>
           <ul style="margin:0 0 12px;padding-left:20px">
             <li style="margin:4px 0"><strong>${escapeHtml(meta.label)}</strong> plan free for 30 days</li>
             <li style="margin:4px 0">${escapeHtml(meta.wallet)} on your account</li>
             <li style="margin:4px 0">Full access — signals, alerts, killzones, voice briefs</li>
           </ul>
           <p style="margin:0">You only start paying once you cross <strong>$100 in verified profit</strong>. If you don't profit, you don't pay.</p>`,
          { label: "Explore the platform", href: `${APP_URL}/signal` },
        ),
      };
    case "approved":
      return {
        subject: `You're in — ${meta.label} plan activated 🎉`,
        html: wrap(
          `Welcome to Jenvu, ${n}.`,
          "Approved · Founding Trader",
          `<p style="margin:0 0 12px">Your application has been approved. Your <strong>${escapeHtml(meta.label)}</strong> plan is now active with <strong>${escapeHtml(meta.wallet)}</strong>.</p>
           <p style="margin:0 0 12px;color:#52525b"><em>${escapeHtml(meta.blurb)}</em></p>
           <p style="margin:16px 0 8px"><strong>Onboarding — 4 quick steps</strong></p>
           <ol style="margin:0 0 12px;padding-left:20px">
             <li style="margin:6px 0">Sign in with this email and open your dashboard.</li>
             <li style="margin:6px 0">Run your first XAU/USD scan on the Signal page.</li>
             <li style="margin:6px 0">Turn on alerts so you catch A/B setups the moment they fire.</li>
             <li style="margin:6px 0">Connect your broker (MyFxBook or statement) so we can verify profit.</li>
           </ol>
           <p style="margin:0">You have 90 days to reach $100 in verified profit — billing only starts after that. If you don't profit, you walk away, no charge.</p>`,
          { label: "Open my dashboard", href: `${APP_URL}/dashboard` },
        ),
      };
    case "rejected":
      return {
        subject: "Founding Trader Program — application update",
        html: wrap(
          `Thanks for applying, ${n}`,
          "Application update",
          `<p style="margin:0 0 12px">We reviewed your application carefully. This month's cohort is a tight fit and unfortunately we're not able to offer you a founding seat right now.</p>
           <p style="margin:0 0 12px">This isn't a judgment on you as a trader — the program is capped at 220 seats and prioritizes very specific criteria each intake.</p>
           <p style="margin:0">You're welcome to sign up on the standard plans at any time, and to re-apply for a future cohort. We appreciate the time you took.</p>`,
          { label: "See plans", href: `${APP_URL}/pricing` },
        ),
      };
    case "waitlisted":
      return {
        subject: "You're on the Founding waitlist",
        html: wrap(
          `You're on the waitlist, ${n}`,
          "Waitlisted · Founding Trader",
          `<p style="margin:0 0 12px">This month's 220 seats are filled, but your application looks strong — you're on the waitlist for the next cohort.</p>
           <p style="margin:0 0 12px">As soon as a seat opens (or the next month rolls over on the 1st), we'll email you to activate your <strong>${escapeHtml(meta.label)}</strong> plan.</p>
           <p style="margin:0">No action needed from your side. Sit tight.</p>`,
          { label: "Explore the platform", href: `${APP_URL}/signal` },
        ),
      };
  }
}

async function enqueueApplicantEmail(admin: any, kind: ApplicantEmailKind, to: string, name: string, plan: string) {
  const { subject, html } = renderApplicantEmail(kind, name, plan);
  const text = htmlToText(html);
  const messageId = crypto.randomUUID();
  try {
    const unsubscribeToken = await getOrCreateUnsubToken(admin, to);
    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: `founding-${kind}`,
      recipient_email: to,
      status: "pending",
    });
    await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        reply_to: SUPPORT_INBOX,
        purpose: "transactional",
        label: `founding-${kind}`,
        idempotency_key: `founding-${kind}-${messageId}`,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error(`[founding] applicant email (${kind}) failed:`, (e as Error)?.message);
  }
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

    const normalizedReferrer =
      data.referrer_email && data.referrer_email.length > 0
        ? data.referrer_email.toLowerCase()
        : null;

    // Prevent the same referrer email from being reused across multiple applications
    if (normalizedReferrer) {
      if (normalizedReferrer === data.email.toLowerCase()) {
        return { ok: false, error: "You can't refer yourself." };
      }
      const { data: existing } = await supabase
        .from("founding_applications" as any)
        .select("id")
        .eq("referrer_email", normalizedReferrer)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return {
          ok: false,
          error: "This referral email has already been used on another application.",
        };
      }
    }

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
      referrer_email: normalizedReferrer,
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
      const admin = createClient<Database>(url, service, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      try {
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
        const adminUnsubToken = await getOrCreateUnsubToken(admin, SUPPORT_INBOX);
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
            unsubscribe_token: adminUnsubToken,
            queued_at: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.error("[founding] notify failed:", (e as Error)?.message);
      }

      // Confirmation email to the applicant
      await enqueueApplicantEmail(admin, "received", data.email.toLowerCase(), data.full_name, data.requested_plan);
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

    // Fetch prior row so we only email on real status transitions
    const { data: prior } = await context.supabase
      .from("founding_applications" as any)
      .select("email, full_name, status, requested_plan")
      .eq("id", data.id)
      .maybeSingle();

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

    // Award referral credit ($5 each) when approved/active
    if (data.status === "approved" || data.status === "active") {
      try {
        const url = process.env.SUPABASE_URL;
        const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && service) {
          const admin = createClient<Database>(url, service, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          await admin.rpc("award_founding_referral" as any, { _application_id: data.id });
        }
      } catch (e) {
        console.error("[founding] referral award failed:", (e as Error)?.message);
      }
    }


    const p = prior as any;
    if (p?.email && data.status && data.status !== p.status) {
      const kindMap: Record<string, ApplicantEmailKind | null> = {
        approved: "approved",
        active: "approved",
        rejected: "rejected",
        waitlisted: "waitlisted",
        pending: null,
        graduated: null,
      };
      const kind = kindMap[data.status];
      if (kind) {
        const url = process.env.SUPABASE_URL;
        const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && service) {
          const admin = createClient<Database>(url, service, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          await enqueueApplicantEmail(admin, kind, String(p.email), String(p.full_name || "there"), String(p.requested_plan || "elite"));
        }
      }
    }

    return { ok: true };
  });

export const foundingStats = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL;
  const pub = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !pub) return { seatsFilled: 0, seatsTotal: 220 };
  const supa = createClient<Database>(url, pub, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const monthKey = new Date().toISOString().slice(0, 7);
  const { count } = await supa
    .from("founding_applications" as any)
    .select("id", { count: "exact", head: true })
    .in("status", ["approved", "active"])
    .eq("seat_month", monthKey);
  return { seatsFilled: count ?? 0, seatsTotal: 220, monthKey };
});

/* ---------------- Document submission tracking ---------------- */

export type DocumentStatusRow = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  requested_plan: string | null;
  document_status: "not_submitted" | "received" | "pending" | "verified" | "rejected";
  documents_submitted_at: string | null;
  documents_verified_at: string | null;
  documents_rejected_at: string | null;
  documents_rejected_reason: string | null;
  documents_note: string | null;
  created_at: string;
};

export const getMyDocumentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DocumentStatusRow | null> => {
    const email = (context.claims as any)?.email as string | undefined;
    if (!email) return null;
    const { data, error } = await context.supabase
      .from("founding_applications" as any)
      .select(
        "id, full_name, email, status, requested_plan, document_status, documents_submitted_at, documents_verified_at, documents_rejected_at, documents_rejected_reason, documents_note, created_at",
      )
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as unknown as DocumentStatusRow) ?? null;
  });

export const markMyDocumentsSubmitted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ note: z.string().trim().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    if (!email) throw new Error("No email on session");
    const url = process.env.SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) throw new Error("Server not configured");
    const admin = createClient<Database>(url, service, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: row } = await admin
      .from("founding_applications" as any)
      .select("id, document_status")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) throw new Error("No application found for this account");
    const r = row as any;
    if (r.document_status === "verified") return { ok: true, already: true };
    const { error } = await admin
      .from("founding_applications" as any)
      .update({
        document_status: "received",
        documents_submitted_at: new Date().toISOString(),
        documents_note: data.note ?? null,
        documents_rejected_at: null,
        documents_rejected_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateDocumentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      document_status: z.enum(["not_submitted", "received", "pending", "verified", "rejected"]),
      rejected_reason: z.string().max(1000).optional(),
      note: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const now = new Date().toISOString();
    const patch: Record<string, any> = {
      document_status: data.document_status,
      updated_at: now,
    };
    if (data.document_status === "verified") patch.documents_verified_at = now;
    if (data.document_status === "rejected") {
      patch.documents_rejected_at = now;
      patch.documents_rejected_reason = data.rejected_reason ?? null;
    }
    if (data.note !== undefined) patch.documents_note = data.note;
    const { error } = await context.supabase
      .from("founding_applications" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
