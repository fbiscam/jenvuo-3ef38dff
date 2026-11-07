import { foundingCreditFor, FOUNDING_PLAN_DAYS, foundingPlanFor } from "@/lib/founding-offer";
import { FOUNDING_SEATS_PER_MONTH, nextSeatOpening, seatsFullMessage } from "@/lib/founding-seats";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const ApplyInput = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  whatsapp_number: z
    .string()
    .trim()
    .min(7, "Enter a valid WhatsApp number")
    .max(24)
    .regex(/^\+?[0-9][0-9\s-]{6,23}$/, "Enter a valid WhatsApp number"),
  country: z.string().trim().max(60).optional().default(""),
  broker: z.string().trim().max(80).optional().default(""),
  experience_years: z.coerce.number().int().min(0).max(80).optional(),
  monthly_volume_usd: z.coerce.number().min(0).max(1_000_000_000).optional(),
  why_joining: z.string().trim().min(10).max(1500),
  myfxbook_url: z.string().trim().max(300).optional().default(""),
  requested_plan: z.enum(["free", "pro", "elite", "ultra"]).default("pro").transform((v) => foundingPlanFor(v)),
  referrer_email: z.string().trim().email().max(255).optional().or(z.literal("")),
});

export type FoundingApplication = {
  id: string;
  full_name: string;
  email: string;
  whatsapp_number?: string | null;
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

const SUPPORT_INBOX = "support@jenvu.com";
const FROM_ADDRESS = "Jenvu Founding <founding@notify.jenvu.com>";
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

const PLAN_META: Record<string, { label: string; wallet: string; amount: string; blurb: string }> = {
  free: { label: "Free", wallet: "$2 starting credit", amount: "$2", blurb: "Try the platform on XAU/USD. Upgrade any time." },
  pro: { label: "Pro", wallet: "$10 wallet credit", amount: "$10", blurb: "Multi-pair scans, realtime alerts, full trade management." },
  elite: { label: "Elite", wallet: "$25 wallet credit", amount: "$25", blurb: "Everything in Pro plus priority AI models & higher scan budget." },
  ultra: { label: "Ultra", wallet: "$50 wallet credit", amount: "$50", blurb: "Top-tier access. Every model, every pair, no throttling." },
};

type ApplicantEmailKind =
  | "received"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "pending"
  | "funded"
  | "password_set"
  | "documents_submitted"
  | "documents_received"
  | "documents_approved"
  | "documents_rejected"
  | "documents_needs_info";

type ApplicantEmailExtras = {
  resetUrl?: string;
  activateHours?: number;
};

function renderApplicantEmail(kind: ApplicantEmailKind, name: string, plan: string, extras: ApplicantEmailExtras = {}) {
  const meta = PLAN_META[foundingPlanFor(plan)];
  const FONT = "'Google Sans Flex','Google Sans','Google Sans Normal',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
  // Site theme: white page, black ink, warm-gray surfaces, black primary pill and gray secondary pill.
  const btn = (c: { label: string; href: string }, primary: boolean) =>
    `<a href="${c.href}" style="display:inline-block;background:${primary ? "#09090b" : "#f2f1ef"};color:${primary ? "#ffffff" : "#09090b"};text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:500;font-size:14px;font-family:${FONT}">${escapeHtml(c.label)}</a>`;
  const wrap = (title: string, tag: string, body: string, cta?: { label: string; href: string }, cta2?: { label: string; href: string }) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;700&display=swap" rel="stylesheet"></head><body style="margin:0;background:#ffffff;font-family:${FONT};color:#18181b;padding:32px 12px">
    <div style="max-width:560px;margin:0 auto">
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 28px">
        <tr>
          <td style="vertical-align:middle"><img src="${APP_URL}/favicon.png" width="28" height="28" alt="Jenvu" style="display:block;border-radius:7px" /></td>
          <td style="vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:20px;font-weight:400;color:#09090b;line-height:1">Jenvu</td>
        </tr>
      </table>
      <div style="display:inline-block;background:#f2f1ef;color:#52525b;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:500">${escapeHtml(tag)}</div>
      <h1 style="font-family:${FONT};font-size:28px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;margin:14px 0 0;color:#09090b">${escapeHtml(title)}</h1>
      <div style="padding:18px 0 4px;font-size:15px;line-height:1.65;color:#3f3f46">${body}</div>
      ${cta ? `<div style="padding:18px 0 8px">${btn(cta, true)}${cta2 ? `&nbsp;&nbsp;${btn(cta2, false)}` : ""}</div>` : ""}
      <div style="margin-top:32px;border-top:1px dashed #d4d4d8;padding-top:18px;font-size:12px;line-height:1.6;color:#a1a1aa">
        Jenvu · AI trading tools for Gold, Bitcoin and EUR/USD · <a href="${APP_URL}" style="color:#71717a;text-decoration:underline">jenvu.com</a> · <a href="https://support.jenvu.com" style="color:#71717a;text-decoration:underline">Help</a><br/>
        Trading involves risk. Jenvu tools do not guarantee profits.
      </div>
    </div></body></html>`;

  // Shared list for the Founding emails: what an approved member gets.
  const box = (rows: string[]) =>
    `<div style="background:#f7f6f4;border-radius:16px;padding:16px 20px;margin:4px 0 14px">${rows
      .map((r) => `<div style="padding:6px 0;font-size:14px;color:#18181b">&#8226;&nbsp;&nbsp;${r}</div>`)
      .join("")}</div>`;
  const perks = () =>
    box([
      `<strong>${escapeHtml(meta.label)}</strong> plan for ${FOUNDING_PLAN_DAYS} days`,
      `$${foundingCreditFor(plan)} API credit (the plan's own) for the same ${FOUNDING_PLAN_DAYS} days`,
      "Jenvu Terminal for Gold, Bitcoin and EUR/USD",
      "JX Bot for MetaTrader 5 once your ID is verified",
    ]);

  const n = escapeHtml(name);
  switch (kind) {
    case "received":
      return {
        subject: "We received your Founding Program application",
        html: wrap(
          `Thanks, ${n}. Your application is in.`,
          "Application received",
          `<p style="margin:0 0 12px">We got your Founding Program application for the <strong>${escapeHtml(meta.label)}</strong> plan. A person on our team reviews every application, usually within <strong>48 hours</strong>.</p>
           <p style="margin:0 0 8px">If you're approved, you get:</p>
           ${perks()}
           <p style="margin:0">After approval you have <strong>2 days to verify your ID</strong>. Until it's verified, the Terminal closes after 2 days and plans can't be bought.</p>`,
          { label: "Read about the program", href: `${APP_URL}/founding` },
        ),
      };
    case "approved": {
      const resetUrl = extras.resetUrl || `${APP_URL}/auth`;
      return {
        subject: "You're approved for the Jenvu Founding Program",
        html: wrap(
          `Welcome, ${n}. You're approved.`,
          "Founding Program · Approved",
          `<p style="margin:0 0 12px">Your Founding Program application is <strong>approved</strong>. Your account is ready and includes:</p>
           ${perks()}
           <p style="margin:0 0 8px;font-weight:500;color:#09090b">Two steps to start</p>
           <p style="margin:0 0 6px">1. Set your password with the secure link below. It works once and is tied to this email.</p>
           <p style="margin:0 0 12px">2. Verify your ID on the Documents page within <strong>2 days</strong>. That keeps the Terminal open, unlocks JX Bot, and lets you buy a plan later.</p>
           <p style="margin:0;color:#71717a">After ${FOUNDING_PLAN_DAYS} days the plan, credit and bot access end. We'll tell you whether the bot reached $200 profit, and you can buy a plan to continue.</p>`,
          { label: "Set my password", href: resetUrl },
          { label: "Verify my ID", href: `${APP_URL}/dashboard/documents` },
        ),
      };
    }
    case "password_set": {
      return {
        subject: "Your Jenvu account is ready",
        html: wrap(
          `You're in, ${n}.`,
          "Founding Program · Account ready",
          `<p style="margin:0 0 12px">Your password is set and your <strong>${escapeHtml(meta.label)}</strong> Founding plan is active on this account.</p>
           <p style="margin:0">If you haven't yet, verify your ID on the Documents page within 2 days of approval to keep the Terminal open and unlock JX Bot.</p>`,
          { label: "Open my dashboard", href: `${APP_URL}/dashboard` },
          { label: "Verify my ID", href: `${APP_URL}/dashboard/documents` },
        ),
      };
    }
    case "funded":
      return {
        subject: "Your Jenvu account has been funded",
        html: wrap(
          `Your account is funded, ${n}.`,
          "Founding Program · Funded",
          `<p style="margin:0 0 12px"><strong>$${foundingCreditFor(plan)}</strong> of API credit is now in your wallet on the <strong>${escapeHtml(meta.label)}</strong> plan. It lasts ${FOUNDING_PLAN_DAYS} days and is spent on Chat, the Jenvu API and AI analysis.</p>
           <p style="margin:0">You can see every credit and charge on your Billing page.</p>`,
          { label: "Open my dashboard", href: `${APP_URL}/dashboard` },
          { label: "View billing", href: `${APP_URL}/dashboard/billing` },
        ),
      };
    case "rejected":
      return {
        subject: "Founding Trader Program — application update",
        html: wrap(
          `Thanks for applying, ${n}`,
          "Application update",
          `<p style="margin:0 0 12px">We reviewed your application carefully. This month's cohort is a tight fit and unfortunately we're not able to offer you a founding seat right now.</p>
           <p style="margin:0 0 12px">This isn't a judgment on you as a trader — the program is capped at 100 seats a month and prioritizes very specific criteria each intake.</p>
           <p style="margin:0 0 12px">You're welcome to re-apply for a future cohort — we'd love to see your updated application.</p>
           <p style="margin:16px 0 0;color:#52525b">If you'd like to share more context about your trading or ask us to reconsider, just hit reply — a real person on our team will read it.</p>`,
          { label: "Reapply to Founding", href: `${APP_URL}/founding` },
        ),
      };
    case "waitlisted":
      return {
        subject: "You're on the Founding waitlist",
        html: wrap(
          `You're on the waitlist, ${n}`,
          "Waitlisted · Founding Trader",
          `<p style="margin:0 0 12px">This month's 100 seats are filled, but your application looks strong — you're on the waitlist for the next cohort.</p>
           <p style="margin:0 0 12px">As soon as a seat opens (or the next month rolls over on the 1st), we'll email you to activate your <strong>${escapeHtml(meta.label)}</strong> plan.</p>
           <p style="margin:0">No action needed from your side. Sit tight.</p>`,
          { label: "Explore the platform", href: `${APP_URL}/` },
        ),
      };
    case "pending":
      return {
        subject: "Your Founding Trader application is under review",
        html: wrap(
          `Your application is pending, ${n}`,
          "Pending · Founding Trader",
          `<p style="margin:0 0 12px">Your application has been moved into our review queue and is currently <strong>pending</strong>.</p>
           <p style="margin:0 0 12px">Our team manually reviews every application. This usually takes up to <strong>48 hours</strong> — you'll get another email as soon as there's a decision.</p>
           <p style="margin:0">No action needed from your side right now. Thanks for your patience.</p>`,
          { label: "Explore the platform", href: `${APP_URL}/` },
        ),
      };
    case "documents_submitted":
      return {
        subject: "We received your documents",
        html: wrap(
          `Got it, ${n} — documents received`,
          "Documents · Submitted",
          `<p style="margin:0 0 12px">Thanks for sending over your identity documents. Your document(s) have safely landed in our review queue.</p>
           <p style="margin:0 0 12px">A real person on our team will look through everything and update your status here — usually within <strong>48 hours</strong>.</p>
           <p style="margin:0">No action needed from your side right now. We'll email you the moment there's a decision.</p>`,
          { label: "Open Documents page", href: `${APP_URL}/dashboard/documents` },
        ),
      };
    case "documents_received":
      return {
        subject: "Your documents are now under review",
        html: wrap(
          `We're reviewing your documents, ${n}`,
          "Documents · Under Review",
          `<p style="margin:0 0 12px">Quick update — your submission has been moved into <strong>active review</strong> by our verification team.</p>
           <p style="margin:0 0 12px">Verification can take up to <strong>48 hours</strong> from this point. You'll get a follow-up email as soon as the outcome is decided.</p>
           <p style="margin:0">You can track the live status any time on your Documents page. Thanks for your patience.</p>`,
          { label: "Open Documents page", href: `${APP_URL}/dashboard/documents` },
        ),
      };
    case "documents_approved":
      return {
        subject: "Congratulations 🎉 Your documents are verified",
        html: wrap(
          `Congratulations, ${n} 🎉`,
          "Documents · Approved",
          `<p style="margin:0 0 12px">Your identity documents have been reviewed and <strong>approved</strong>. Your Founding Trader account is fully verified.</p>
           <p style="margin:0 0 12px">Your <strong>${escapeHtml(meta.label)}</strong> Founding plan stays active for its ${FOUNDING_PLAN_DAYS} days and JX Bot is now unlocked — open the JX Bot page to add your IP and download it.</p>
           <p style="margin:0">Thanks for keeping the program transparent.</p>`,
          { label: "Open my dashboard", href: `${APP_URL}/dashboard` },
        ),
      };
    case "documents_rejected":
      return {
        subject: "Documents need an update",
        html: wrap(
          `Documents need an update, ${n}`,
          "Documents · Action Required",
          `<p style="margin:0 0 12px">We reviewed your identity document submission and unfortunately we can't verify it as-is. You can re-upload updated documents right away from your Documents page — there's no waiting period.</p>
           <p style="margin:0 0 12px">If the admin left a reason, you'll see it on your Documents page. Common asks: a clearer photo, both sides of your ID, or a fully readable driving license.</p>
           <p style="margin:0">Reply to this email if you need help.</p>`,
          { label: "Re-upload documents", href: `${APP_URL}/dashboard/documents` },
        ),
      };
    case "documents_needs_info":
      return {
        subject: "We need a bit more info on your documents",
        html: wrap(
          `Quick follow-up, ${n}`,
          "Documents · More Info Needed",
          `<p style="margin:0 0 12px">Our reviewer looked at your identity document submission and needs a small update before it can be approved.</p>
           <p style="margin:0 0 12px">Head to your Documents page — you'll see the exact note from the reviewer and can upload the missing piece there. No need to redo everything, just address the ask.</p>
           <p style="margin:0">Reply to this email if anything is unclear.</p>`,
          { label: "View reviewer note", href: `${APP_URL}/dashboard/documents` },
        ),
      };
  }
}

async function enqueueApplicantEmail(admin: any, kind: ApplicantEmailKind, to: string, name: string, plan: string, dedupeKey?: string, extras: ApplicantEmailExtras = {}) {
  const rendered = renderApplicantEmail(kind, name, plan, extras);
  if (!rendered) return;
  const { subject, html } = rendered;
  const text = htmlToText(html);
  const messageId = crypto.randomUUID();
  const idempotencyKey = dedupeKey ? `founding-${kind}-${dedupeKey}` : `founding-${kind}-${messageId}`;
  try {
    const { sendManagedEmailLogged } = await import("@/lib/email/managed.server");
    await sendManagedEmailLogged(admin, {
      to,
      from: FROM_ADDRESS,
      subject,
      html,
      text,
      label: `founding-${kind}`,
      templateName: `founding-${kind}`,
      idempotencyKey,
      replyTo: SUPPORT_INBOX,
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

    const email = data.email.toLowerCase();
    // Lookups need the server key: signed-out visitors can't read applications, so a
    // publishable-key check always came back empty and the insert then failed on the
    // unique email/referrer index with a misleading "already applied" message.
    const reader = service
      ? createClient<Database>(url, service, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } })
      : supabase;

    const { data: prior } = await reader
      .from("founding_applications" as any)
      .select("id, status, user_id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    const priorRow = prior as { id: string; status: string | null; user_id: string | null } | null;
    let hasAccount = false;
    if (priorRow?.user_id && service) {
      const { data: u } = await (reader as any).auth.admin.getUserById(priorRow.user_id);
      hasAccount = Boolean(u?.user);
    }
    const { foundingReapplyDecision } = await import("@/lib/founding-reapply");
    const decision = foundingReapplyDecision(priorRow, hasAccount);
    if (decision.action === "block") return { ok: false, error: decision.error };

    // Prevent the same referrer email from being reused across multiple applications
    if (normalizedReferrer) {
      if (normalizedReferrer === email) {
        return { ok: false, error: "You can't refer yourself." };
      }
      let refQuery = reader
        .from("founding_applications" as any)
        .select("id")
        .eq("referrer_email", normalizedReferrer);
      if (priorRow) refQuery = refQuery.neq("id", priorRow.id);
      const { data: existing } = await refQuery.limit(1).maybeSingle();
      if (existing) {
        return {
          ok: false,
          error: "This referral email has already been used on another application.",
        };
      }
    }

    // Seats full this month: no new applications until next month.
    if (service) {
      const counter = createClient<Database>(url, service, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { filled, total } = await countFoundingSeats(counter);
      if (filled >= total) return { ok: false, error: seatsFullMessage() };
    }

    // Save with the server key: the form is signed out, and an email that already has an
    // account gets linked to it by a database trigger, which the signed-out rule rejects.
    // Only the validated fields below are written; status stays at its "pending" default.
    const writer = service
      ? createClient<Database>(url, service, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } })
      : supabase;
    // Reopen: a rejected applicant, or one whose account was removed, starts fresh.
    if (decision.action === "reopen" && priorRow) {
      const { error: delErr } = await writer.from("founding_applications" as any).delete().eq("id", priorRow.id);
      if (delErr) {
        console.error("[founding] reopen failed:", delErr.message);
        return { ok: false, error: "Could not submit. Please try again." };
      }
    }
    const { error } = await writer.from("founding_applications" as any).insert({
      full_name: data.full_name,
      email,
      whatsapp_number: data.whatsapp_number,
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
        if (msg.includes("referrer")) {
          return { ok: false, error: "This referral email has already been used on another application." };
        }
        return { ok: false, error: "Your application is already in and under review. We'll email you soon." };
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
          wa: escapeHtml(data.whatsapp_number),
          c: escapeHtml(data.country || "—"),
          b: escapeHtml(data.broker || "—"),
          y: String(data.experience_years ?? "—"),
          v: String(data.monthly_volume_usd ?? "—"),
          w: escapeHtml(data.why_joining).replace(/\n/g, "<br/>"),
          m: escapeHtml(data.myfxbook_url || "—"),
        };
        const html = `<!doctype html><html><body style="font-family:'Google Sans Flex','Google Sans','Google Sans Normal',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#fff;color:#111;padding:24px">
          <div style="max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280">New founding application</div>
            <h1 style="font-size:20px;margin:8px 0 16px">${safe.n}</h1>
            <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:16px">
              <tr><td style="color:#6b7280;padding:4px 0;width:140px">Email</td><td>${safe.e}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0">WhatsApp</td><td><a href="https://wa.me/${safe.wa.replace(/[^0-9]/g, "")}">${safe.wa}</a></td></tr>
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
        const text = `New founding application\n\n${data.full_name} <${data.email}>\nWhatsApp: ${data.whatsapp_number}\nRequested plan: ${data.requested_plan.toUpperCase()}\nCountry: ${data.country || "—"}\nBroker: ${data.broker || "—"}\nExperience: ${data.experience_years ?? "—"} yrs\nMonthly volume: $${data.monthly_volume_usd ?? "—"}\nMyFxBook: ${data.myfxbook_url || "—"}\n\n${data.why_joining}`;
        const messageId = crypto.randomUUID();
        const { sendManagedEmailLogged } = await import("@/lib/email/managed.server");
        await sendManagedEmailLogged(admin, {
          to: SUPPORT_INBOX,
          from: FROM_ADDRESS,
          subject: `[Founding] ${data.full_name} — ${data.requested_plan.toUpperCase()}`,
          html,
          text,
          label: "founding-application",
          templateName: "founding-application",
          idempotencyKey: `founding-${messageId}`,
          replyTo: data.email,
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
  const { isAdminOrOpsUnlocked } = await import("@/lib/admin-guard.server");
  const ok = await isAdminOrOpsUnlocked(supabase, userId);
  if (!ok) throw new Error("Forbidden: admin access required");
}

export const listFoundingApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FoundingApplication[]> => {
    await assertAdmin(context.supabase, context.userId);
    // Internal review columns (admin_notes, ip_address, user_agent) are not
    // readable by the `authenticated` role — admins read them via service role
    // after the explicit admin check above.
    const admin = await getServiceClient();
    const { data, error } = await admin
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
      // Plan chosen by the reviewing admin. The applicant's requested_plan is
      // only a hint and is never used to grant a tier.
      plan: z.enum(["pro", "elite", "ultra"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Fetch prior row so we only email on real status transitions
    const { data: prior } = await context.supabase
      .from("founding_applications" as any)
      .select("email, full_name, status, requested_plan, document_status, user_id")
      .eq("id", data.id)
      .maybeSingle();

    // Funding (approved -> active) adds the Founding API credit, and only once the ID is verified.
    const funding = data.status === "active" && (prior as any)?.status === "approved";
    if (funding && String((prior as any)?.document_status || "") !== "verified") {
      throw new Error("Verify this member's ID first. Credit can only be funded after ID verification.");
    }

    // The Founding Program grants Pro or Elite only (30 days): the admin's pick, else the applicant's.
    if (data.status === "approved" || data.status === "active" || data.plan) {
      data.plan = foundingPlanFor(data.plan ?? (prior as any)?.requested_plan);
    }

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.status) {
      patch.status = data.status;
      // Funding an approved member keeps their original approval date (the 30-day clock).
      if (data.status === "approved" || (data.status === "active" && !funding)) {
        patch.approved_at = new Date().toISOString();
        patch.seat_month = new Date().toISOString().slice(0, 7);
      }
    }
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    if (data.first_profit_reached) patch.first_profit_at = new Date().toISOString();
    const { error } = await context.supabase
      .from("founding_applications" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const p = prior as any;

    // On APPROVED: don't activate the plan yet — just generate a secure
    // set-password link so the user can sign in. Plan activation happens
    // separately when the admin marks the application "active" (funded).
    let approvedResetUrl: string | null = null;
    if (data.status === "approved" && data.status !== p?.status && p?.email) {
      const url = process.env.SUPABASE_URL;
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && service) {
        const admin = createClient<Database>(url, service, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const targetEmail = String(p.email).toLowerCase();
        const planId = data.plan as string;
        // Check if the user already has an account
        let existingUserId: string | null = null;
        for (let page = 1; page <= 20 && !existingUserId; page++) {
          const { data: userList } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
          const found = userList?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
          if (found) existingUserId = found.id;
          if (!userList?.users?.length || (userList.users.length < 1000)) break;
        }
        // Fresh account on approval: wipe ALL user-scoped data so the new
        // founding trader starts clean — no old alerts, notifications,
        // trades, credits, referrals, devices, etc.
        if (existingUserId) {
          const uid = existingUserId;
          const tables = [
            "user_notifications", "signal_alert_subscribers", "alert_preferences",
            "credit_ledger", "credit_lots", "credit_balances", "credit_charge_audit",
            "ai_cost_log", "trade_journal", "trade_setup_links", "trade_setups",
            "saved_signals", "voice_history", "trusted_devices", "account_devices",
            "email_change_requests", "email_change_audit", "user_subscriptions",
            "referral_codes", "mail_message_state",
          ];
          for (const t of tables) {
            const { error: wErr } = await admin.from(t as any).delete().eq("user_id", uid);
            if (wErr) console.error(`[founding] fresh-wipe ${t} failed:`, wErr.message);
          }
          const { error: refErr } = await admin.from("referrals" as any).delete().or(`referrer_id.eq.${uid},referred_user_id.eq.${uid}`);
          if (refErr) console.error("[founding] fresh-wipe referrals failed:", refErr.message);
        }
        try {
          const linkType = existingUserId ? "recovery" : "invite";
          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: linkType as any,
            email: targetEmail,
            options: {
              redirectTo: `${APP_URL}/reset-password`,
              data: existingUserId
                ? undefined
                : { full_name: p.full_name || null, founding_application_id: data.id, requested_plan: planId },
            },
          });
          if (linkErr) {
            console.error(`[founding] generateLink(${linkType}) failed:`, linkErr.message);
          }
          approvedResetUrl = (linkData as any)?.properties?.action_link || null;
          // Approved members get their selected plan right away (Terminal
          // unlocks too; Pro or Elite for 30 days + that plan's API credit ending with it; ID verification within 2 days).
          const planUserId = existingUserId || (linkData as any)?.user?.id || null;
          if (planUserId) {
            // Link the application to the account so Documents/ID upload finds it.
            await linkApplicationToUser(admin, data.id, planUserId);
            const { error: planErr } = await admin.rpc("activate_founding_trial" as any, {
              _user_id: planUserId,
              _plan_id: planId,
            });
            if (planErr) console.error("[founding] plan activation on approval failed:", planErr.message);
          }
        } catch (e) {
          console.error("[founding] generateLink threw:", (e as Error)?.message);
        }
      }
    }

    // On ACTIVE (admin marked account funded / $100): activate the plan and
    // send the "account funded" email. This is the point where the wallet
    // actually gets credited.
    // Skipped when coming from "approved": the plan was already granted then.
    if (data.status === "active" && data.status !== p?.status && p?.status !== "approved" && p?.email) {
      const url = process.env.SUPABASE_URL;
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && service) {
        const admin = createClient<Database>(url, service, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const planId = data.plan as string;
        const targetEmail = String(p.email).toLowerCase();
        let matchedUserId: string | null = null;
        for (let page = 1; page <= 20 && !matchedUserId; page++) {
          const { data: userList, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
          if (listErr) throw new Error(`plan activation: ${listErr.message}`);
          const found = userList?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
          if (found) matchedUserId = found.id;
          if (!userList?.users?.length || (userList.users.length < 1000)) break;
        }
        if (matchedUserId) {
          await linkApplicationToUser(admin, data.id, matchedUserId);
          const { error: rpcErr } = await admin.rpc("activate_founding_trial" as any, {
            _user_id: matchedUserId,
            _plan_id: planId,
          });
          if (rpcErr) throw new Error(`plan activation: ${rpcErr.message}`);
        }
      }
    }

    // FUND: approved + ID-verified member gets the Founding API credit now (admin action).
    if (funding) {
      const admin = await getServiceClient();
      let uid: string | null = (prior as any)?.user_id ?? null;
      if (!uid && p?.email) {
        const target = String(p.email).toLowerCase();
        for (let page = 1; page <= 20 && !uid; page++) {
          const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
          uid = list?.users?.find((u) => u.email?.toLowerCase() === target)?.id ?? null;
          if (!list?.users?.length || list.users.length < 1000) break;
        }
      }
      if (!uid) throw new Error("This member has no account yet, so no credit was added.");
      const { error: creditErr } = await admin.rpc("release_founding_credit" as any, { _user_id: uid });
      if (creditErr) throw new Error(`credit: ${creditErr.message}`);
    }

    // Referral reward ($5 each) is now awarded when the referred user upgrades
    // to a paid plan after their trial — handled in public.set_user_plan.

    // Only send emails for actions that were actually fulfilled in this update.
    // - approved: password-reset link email
    // - funded:   only when status transitions to "active" (account funded)
    //             OR admin marks first_profit_reached=true
    // - rejected / waitlisted / pending: on their respective status transitions
    const kinds: ApplicantEmailKind[] = [];
    if (p?.email && data.status) {
      const changed = data.status !== p.status;
      if (data.status === "approved" && changed) kinds.push("approved");
      else if (data.status === "active" && changed) kinds.push("funded");
      else if (data.status === "rejected" && changed) kinds.push("rejected");
      // Waitlisted / pending: email EVERY time admin sets this status,
      // even when re-applying the same status. Admin re-triggers the email
      // by re-saving the status.
      else if (data.status === "waitlisted") kinds.push("waitlisted");
      else if (data.status === "pending") kinds.push("pending");
    }
    if (p?.email && data.first_profit_reached && !kinds.includes("funded")) {
      kinds.push("funded");
    }
    if (kinds.length > 0) {
      const url = process.env.SUPABASE_URL;
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && service) {
        const admin = createClient<Database>(url, service, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        for (const kind of kinds) {
          const extras: ApplicantEmailExtras = kind === "approved" && approvedResetUrl ? { resetUrl: approvedResetUrl } : {};
          // For repeatable kinds (waitlisted/pending) include a timestamp in
          // the dedupe key so each admin action produces a new email.
          const repeatable = kind === "waitlisted" || kind === "pending";
          const dedupe = repeatable ? `${data.id}-${kind}-${Date.now()}` : `${data.id}-${kind}`;
          await enqueueApplicantEmail(admin, kind, String(p.email), String(p.full_name || "there"), String(p.requested_plan || "elite"), dedupe, extras);
        }
      }
    }





    return { ok: true };
  });

// Called from /reset-password after the user successfully sets a new
// password. Sends the "You're in — plan activates in 4 hours" email once.
// Uses the founding_applications row keyed by the caller's email so we
// only email users tied to a real approved application.
export const notifyFoundingPasswordSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; sent: boolean }> => {
    const email = (context.claims as any)?.email as string | undefined;
    if (!email) return { ok: true, sent: false };
    const url = process.env.SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) return { ok: true, sent: false };
    const admin = createClient<Database>(url, service, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: app } = await admin
      .from("founding_applications" as any)
      .select("id, full_name, email, requested_plan, status")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const a = app as any;
    if (!a || (a.status !== "approved" && a.status !== "active")) return { ok: true, sent: false };
    await enqueueApplicantEmail(
      admin,
      "password_set",
      String(a.email),
      String(a.full_name || "there"),
      String(a.requested_plan || "elite"),
      `${a.id}-password-set`,
      { activateHours: 4 },
    );
    return { ok: true, sent: true };
  });



export const foundingStats = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return { seatsFilled: 0, seatsTotal: FOUNDING_SEATS_PER_MONTH, nextOpenAt: nextSeatOpening().toISOString() };
  // Use service role — RLS blocks anon reads on founding_applications.
  // We only return an aggregate count, never PII.
  const supa = createClient<Database>(url, service, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { filled, total, monthKey } = await countFoundingSeats(supa);
  return { seatsFilled: filled, seatsTotal: total, monthKey, nextOpenAt: nextSeatOpening().toISOString() };
});


/** Approved seats this month (seat_month, else approved_at / created_at in the month). */
async function countFoundingSeats(supa: any) {
  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const { data: rows } = await supa
    .from("founding_applications" as any)
    .select("id, seat_month, approved_at, created_at, status")
    .in("status", ["approved", "active", "graduated", "verified"]);
  const filled = (rows ?? []).filter((r: any) => {
    if (r.seat_month === monthKey) return true;
    const ts = r.approved_at || r.created_at;
    return ts && ts >= monthStart && ts < monthEnd;
  }).length;
  return { filled, total: FOUNDING_SEATS_PER_MONTH, monthKey };
}

/* ---------------- Document submission tracking ---------------- */

export type DocumentStatusRow = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  requested_plan: string | null;
  document_status: "not_submitted" | "received" | "pending" | "verified" | "rejected" | "needs_info";
  documents_submitted_at: string | null;
  documents_verified_at: string | null;
  documents_rejected_at: string | null;
  documents_rejected_reason: string | null;
  documents_note: string | null;
  documents_info_request: string | null;
  documents_info_requested_at: string | null;
  created_at: string;
};

export const getMyDocumentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DocumentStatusRow | null> => {
    try {
      // Server-side lookup by account id, then by the signed-in email (approval
      // can happen before the row is linked). RLS only sees linked rows, so a
      // just-approved member used to get "No application found".
      const row = await getMyApplication(context, DOC_STATUS_FIELDS);
      return (row as unknown as DocumentStatusRow) ?? null;
    } catch (e) {
      console.error("getMyDocumentStatus threw", e);
      return null;
    }
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
      document_status: z.enum(["not_submitted", "received", "pending", "verified", "rejected", "needs_info"]),
      rejected_reason: z.string().max(1000).optional(),
      info_request: z.string().max(1000).optional(),
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
    if (data.document_status === "needs_info") {
      patch.documents_info_request = data.info_request ?? null;
      patch.documents_info_requested_at = now;
    }
    if (data.note !== undefined) patch.documents_note = data.note;

    // Use the service client so RLS or session edge cases can't hide the prior row
    // (email dispatch depends on this read succeeding).
    const admin = await getServiceClient();

    const { data: priorRow } = await admin
      .from("founding_applications" as any)
      .select("email, full_name, requested_plan, document_status")
      .eq("id", data.id)
      .maybeSingle();
    const prior = priorRow as any;

    const { error } = await admin
      .from("founding_applications" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Fire applicant email on every admin action — even if status is unchanged,
    // the admin may intentionally re-notify the user (mark reviewing, reject, etc.).
    const alwaysEmail = true;
    if (prior?.email && (alwaysEmail || prior.document_status !== data.document_status)) {
      const kind: ApplicantEmailKind | null =
        data.document_status === "verified"
          ? "documents_approved"
          : data.document_status === "rejected"
            ? "documents_rejected"
            : data.document_status === "needs_info"
              ? "documents_needs_info"
              : data.document_status === "pending" || data.document_status === "received"
                ? "documents_received"
                : null;
      if (kind) {
        try {
          await enqueueApplicantEmail(
            admin,
            kind,
            String(prior.email),
            String(prior.full_name || "there"),
            String(prior.requested_plan || "elite"),
            `${data.id}-${kind}-${Date.now()}`,
          );
        } catch (e) {
          console.error("[founding] doc-status email enqueue failed:", (e as Error)?.message);
        }
        // Also deliver an in-app @jenvu.email message from notifications@
        try {
          const { sendSystemMailByEmail } = await import("@/lib/system-mail.server");
          const name = String(prior.full_name || "there").split(/\s+/)[0];
          const subj =
            kind === "documents_approved"
              ? "Your documents were approved ✅"
              : kind === "documents_rejected"
                ? "Action required: documents rejected"
                : kind === "documents_needs_info"
                  ? "We need a bit more information"
                  : "Your documents are now under review";
          const bodyLines: string[] = [`Hi ${name},`, ``];
          if (kind === "documents_approved") {
            bodyLines.push("Great news — your submitted documents have been approved.");
            bodyLines.push("Your Founding program access is now fully active.");
          } else if (kind === "documents_rejected") {
            bodyLines.push("Unfortunately your documents were not approved.");
            if (data.rejected_reason) bodyLines.push("", `Reason: ${data.rejected_reason}`);
            bodyLines.push("", "You can resubmit right away from your Documents page.");
          } else if (kind === "documents_needs_info") {
            bodyLines.push("Our review team needs a bit more information before we can approve.");
            if (data.info_request) bodyLines.push("", `Requested: ${data.info_request}`);
            bodyLines.push("", "Please open your Documents page and submit the requested update.");
          } else {
            bodyLines.push("Quick update — your submission has been moved into active review by our verification team.", "", "Verification can take up to 48 hours from this point. You'll get a follow-up email as soon as the outcome is decided.", "", "You can track the live status any time on your Documents page.");
          }
          bodyLines.push("", "— Jenvu Notifications");
          await sendSystemMailByEmail({
            from: "notifications@jenvu.email",
            toEmail: String(prior.email),
            subject: subj,
            body: bodyLines.join("\n"),
          });
        } catch (e) {
          console.error("[founding] system-mail doc-status failed:", (e as Error)?.message);
        }
      }
    }
    return { ok: true };
  });

/* ---------------- Identity document file uploads ---------------- */

export type FoundingDocFile = {
  id: string;
  application_id: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  original_name: string | null;
  doc_kind?: string | null;
  created_at: string;
  signed_url?: string | null;
};

const BUCKET = "founding-docs";

async function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Server not configured");
  return createClient<Database>(url, service, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function signPaths(admin: any, rows: FoundingDocFile[]): Promise<FoundingDocFile[]> {
  const paths = rows.map((r) => r.storage_path);
  if (!paths.length) return rows;
  const { data } = await admin.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const map = new Map<string, string>();
  (data || []).forEach((d: any) => {
    if (d && d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return rows.map((r) => ({ ...r, signed_url: map.get(r.storage_path) ?? null }));
}

const DOC_STATUS_FIELDS =
  "id, full_name, email, status, requested_plan, document_status, documents_submitted_at, documents_verified_at, documents_rejected_at, documents_rejected_reason, documents_note, documents_info_request, documents_info_requested_at, created_at, user_id";

/** Bind an application to an account once (never re-points a row already linked elsewhere). */
async function linkApplicationToUser(admin: any, applicationId: string, userId: string) {
  const { error } = await admin
    .from("founding_applications" as any)
    .update({ user_id: userId })
    .eq("id", applicationId)
    .is("user_id", null);
  if (error) console.error("[founding] link application to user failed:", error.message);
}

// Returns the founding_applications row for the current user: linked by user_id,
// else matched by the signed-in email and linked on the spot (creates none).
async function getMyApplication(context: any, fields = "id, email, full_name, requested_plan, document_status, documents_rejected_at, user_id") {
  const email = (context.claims as any)?.email as string | undefined;
  const admin = await getServiceClient();
  const { data: linked } = await admin
    .from("founding_applications" as any)
    .select(fields)
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (linked) return linked as any;
  if (!email) return null;
  const { data: legacy } = await admin
    .from("founding_applications" as any)
    .select(fields)
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = legacy as any;
  if (!row) return null;
  if (row.user_id && row.user_id !== context.userId) return null; // belongs to another account
  if (!row.user_id) {
    await linkApplicationToUser(admin, row.id, context.userId);
    row.user_id = context.userId;
  }
  return row;
}

export const registerDocumentFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      storage_path: z.string().min(3).max(500),
      mime_type: z.string().min(3).max(120),
      file_size: z.number().int().min(1).max(500 * 1024 * 1024),
      original_name: z.string().max(255).optional(),
      doc_kind: z.enum(["identity", "driving_license"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const app = await getMyApplication(context);
    if (!app) throw new Error("No Founding application found for this account");
    // Enforce folder ownership on stored path
    if (!data.storage_path.startsWith(`${context.userId}/`)) {
      throw new Error("Invalid storage path");
    }
    // Users can resubmit at any time after rejection or needs_info — no waiting window.
    const admin = await getServiceClient();
    // Server-side check: the file must actually exist in storage at that path, with a matching size.
    const slash = data.storage_path.lastIndexOf("/");
    const folder = data.storage_path.slice(0, slash);
    const fileName = data.storage_path.slice(slash + 1);
    if (!fileName || data.storage_path.includes("..")) throw new Error("Invalid storage path");
    const { data: listed, error: listErr } = await admin.storage.from(BUCKET).list(folder, { search: fileName, limit: 10 });
    const obj = (listed ?? []).find((o: any) => o.name === fileName);
    const realSize = Number((obj as any)?.metadata?.size ?? 0);
    if (listErr || !obj || !realSize) throw new Error("Upload not found. Please upload the document again.");
    if (!/^(image\/|video\/|application\/pdf$)/i.test(String((obj as any)?.metadata?.mimetype ?? data.mime_type))) {
      throw new Error("Unsupported document type.");
    }
    data.file_size = realSize;
    const { error } = await admin.from("founding_documents" as any).insert({
      application_id: app.id,
      user_id: context.userId,
      storage_path: data.storage_path,
      mime_type: data.mime_type,
      file_size: data.file_size,
      original_name: data.original_name ?? null,
      doc_kind: data.doc_kind,
    });
    if (error) throw new Error(error.message);
    // Bump application to "received" (unless verified)
    if (app.document_status !== "verified") {
      await admin
        .from("founding_applications" as any)
        .update({
          document_status: "received",
          documents_submitted_at: new Date().toISOString(),
          documents_rejected_at: null,
          documents_rejected_reason: null,
          documents_info_request: null,
          documents_info_requested_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", app.id);
      // Notify applicant that documents landed (idempotent per application submission window)
      if (app.email) {
        await enqueueApplicantEmail(
          admin,
          "documents_submitted",
          String(app.email),
          String(app.full_name || "there"),
          String(app.requested_plan || "elite"),
          `${app.id}-docs-submitted-${Date.now()}`,
        );
        try {
          const { sendSystemMail } = await import("@/lib/system-mail.server");
          const name = String(app.full_name || "there").split(/\s+/)[0];
          await sendSystemMail({
            from: "notifications@jenvu.email",
            toUserId: context.userId,
            subject: "We received your documents",
            body: [
              `Hi ${name},`,
              ``,
              `Thanks for sending over your identity documents — your document(s) are safely in our review queue.`,
              ``,
              `A real person on our team will review and update your status here, usually within 48 hours.`,
              ``,
              `— Jenvu Notifications`,
            ].join("\n"),
          });
        } catch (e) {
          console.error("[founding] system-mail docs-submitted failed:", (e as Error)?.message);
        }
      }
    }
    return { ok: true };
  });

export const listMyDocumentFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FoundingDocFile[]> => {
    const app = await getMyApplication(context);
    if (!app) return [];
    const admin = await getServiceClient();
    const { data, error } = await admin
      .from("founding_documents" as any)
      .select("id, application_id, storage_path, mime_type, file_size, original_name, doc_kind, created_at")
      .eq("application_id", app.id)
      .neq("doc_kind", "earning_proof")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return await signPaths(admin, (data ?? []) as any);
  });

export const deleteMyDocumentFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getServiceClient();
    const { data: row } = await admin
      .from("founding_documents" as any)
      .select("id, user_id, storage_path")
      .eq("id", data.id)
      .maybeSingle();
    const r = row as any;
    if (!r || r.user_id !== context.userId) throw new Error("Not found");
    await admin.storage.from(BUCKET).remove([r.storage_path]);
    await admin.from("founding_documents" as any).delete().eq("id", data.id);
    return { ok: true };
  });

export type AdminDocSubmission = {
  application_id: string;
  email: string;
  full_name: string;
  profile_full_name: string | null;
  requested_plan: string | null;
  status: string;
  document_status: string;
  documents_submitted_at: string | null;
  documents_note: string | null;
  documents_rejected_reason: string | null;
  documents_rejected_at: string | null;
  documents_info_request: string | null;
  documents_info_requested_at: string | null;
  files: FoundingDocFile[];
};


export const adminListDocumentSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminDocSubmission[]> => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getServiceClient();
    const { data: apps, error } = await admin
      .from("founding_applications" as any)
      .select(
        "id, user_id, email, full_name, requested_plan, status, document_status, documents_submitted_at, documents_note, documents_rejected_reason, documents_rejected_at, documents_info_request, documents_info_requested_at",
      )
      .neq("document_status", "not_submitted")
      .order("documents_submitted_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const list = (apps ?? []) as any[];
    if (!list.length) return [];
    const ids = list.map((a) => a.id);
    const { data: files } = await admin
      .from("founding_documents" as any)
      .select("id, application_id, storage_path, mime_type, file_size, original_name, doc_kind, created_at")
      .in("application_id", ids)
      .order("created_at", { ascending: false });
    const signed = await signPaths(admin, (files ?? []) as any);
    const byApp = new Map<string, FoundingDocFile[]>();
    signed.forEach((f) => {
      const arr = byApp.get(f.application_id) ?? [];
      arr.push(f);
      byApp.set(f.application_id, arr);
    });

    // Account profile names (what the user set on their profile page)
    const userIds = list.map((a) => a.user_id).filter(Boolean) as string[];
    const nameByUser = new Map<string, string | null>();
    if (userIds.length) {
      const { data: profs } = await admin
        .from("profiles" as any)
        .select("id, full_name")
        .in("id", userIds);
      (profs ?? []).forEach((p: any) => nameByUser.set(p.id, p.full_name ?? null));
    }

    return list.map((a) => ({
      application_id: a.id,
      email: a.email,
      full_name: a.full_name,
      profile_full_name: a.user_id ? nameByUser.get(a.user_id) ?? null : null,
      requested_plan: a.requested_plan,
      status: a.status,
      document_status: a.document_status,
      documents_submitted_at: a.documents_submitted_at,
      documents_note: a.documents_note,
      documents_rejected_reason: a.documents_rejected_reason,
      documents_rejected_at: a.documents_rejected_at,
      documents_info_request: a.documents_info_request,
      documents_info_requested_at: a.documents_info_requested_at,
      files: byApp.get(a.id) ?? [],
    }));

  });
