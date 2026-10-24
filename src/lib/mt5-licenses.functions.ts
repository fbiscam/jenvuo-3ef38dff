import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMt5Plan, licenseLimit, MT5_ACCOUNT_RE, newLicenseKey } from "./mt5-licenses";

export type Mt5LicenseRow = { id: string; license_key: string; mt5_account: string | null; plan_id: string; revoked_at: string | null; last_validated_at: string | null; created_at: string };

async function readPlan(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: sub } = await db.from("user_subscriptions").select("plan_id,status,is_trial,current_period_end").eq("user_id", userId).maybeSingle();
  const plan = String(sub?.plan_id || "free").toLowerCase();
  const active = !!sub && (sub.status === "active" || sub.status === "trialing") && !sub.is_trial && (!sub.current_period_end || Date.parse(sub.current_period_end) > Date.now());
  const ok = active && isMt5Plan(plan);
  return { db, plan: ok ? plan : "free", allowed: ok, limit: ok ? licenseLimit(plan) : 0, expiresAt: ok ? (sub.current_period_end as string | null) : null };
}

export const getMt5Access = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, ...access } = await readPlan(context.userId);
    const { data } = await db.from("mt5_licenses").select("id,license_key,mt5_account,plan_id,revoked_at,last_validated_at,created_at").eq("user_id", context.userId).order("created_at", { ascending: false });
    return { ...access, licenses: (access.allowed ? data ?? [] : []) as Mt5LicenseRow[] };
  });

export const createMt5License = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mt5_account: z.string().trim().regex(MT5_ACCOUNT_RE, "Enter digits only") }).parse(d))
  .handler(async ({ context, data }) => {
    const { db, allowed, limit, plan } = await readPlan(context.userId);
    if (!allowed) return { ok: false as const, error: "A Pro, Elite or Ultra plan is required." };
    const { data: rows } = await db.from("mt5_licenses").select("id,mt5_account").eq("user_id", context.userId).is("revoked_at", null);
    const list = rows ?? [];
    if (list.some((r: any) => r.mt5_account === data.mt5_account)) return { ok: false as const, error: "This MT5 account already has a license." };
    // Fill an unbound license created after payment first.
    const free = list.find((r: any) => !r.mt5_account);
    if (free) {
      await db.from("mt5_licenses").update({ mt5_account: data.mt5_account, plan_id: plan }).eq("id", free.id);
      return { ok: true as const };
    }
    if (list.length >= limit) return { ok: false as const, error: `Your plan allows ${limit} license${limit > 1 ? "s" : ""}. Revoke one or upgrade.` };
    const { error } = await db.from("mt5_licenses").insert({ user_id: context.userId, license_key: newLicenseKey(), mt5_account: data.mt5_account, plan_id: plan });
    return error ? { ok: false as const, error: "Could not create the license." } : { ok: true as const };
  });

export const revokeMt5License = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("mt5_licenses").update({ revoked_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId);
    return { ok: true as const };
  });

export const getBotDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, allowed } = await readPlan(context.userId);
    if (!allowed) return { ok: false as const, error: "A Pro, Elite or Ultra plan is required." };
    const { data, error } = await db.storage.from("bot-files").createSignedUrl("JX-Bot-MT5.zip", 300, { download: true });
    return error || !data ? { ok: false as const, error: "Download unavailable." } : { ok: true as const, url: data.signedUrl as string };
  });
