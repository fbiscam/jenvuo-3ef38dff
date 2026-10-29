import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMt5Plan, licenseLimit, MT5_ACCOUNT_RE, newLicenseKey, targetsFor } from "./mt5-licenses";

export type Mt5LicenseRow = { id: string; license_key: string; mt5_account: string | null; plan_id: string; revoked_at: string | null; last_validated_at: string | null; created_at: string };

async function readPlan(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: sub } = await db.from("user_subscriptions").select("plan_id,status,is_trial,current_period_end").eq("user_id", userId).maybeSingle();
  const plan = String(sub?.plan_id || "free").toLowerCase();
  const active = !!sub && (sub.status === "active" || sub.status === "trialing") && (!sub.current_period_end || Date.parse(sub.current_period_end) > Date.now());
  const ok = active && isMt5Plan(plan);
  const t = ok ? targetsFor(plan as any, userId) : { daily: 0, monthly: 0 };
  return { db, plan: ok ? plan : "free", allowed: ok, limit: ok ? licenseLimit(plan) : 0, expiresAt: ok ? (sub.current_period_end as string | null) : null, dailyTarget: t.daily, monthlyTarget: t.monthly };
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
  .inputValidator((d: unknown) => z.object({ ip: z.string().trim().refine((v) => !!normalizeIp(v), "Enter a valid IP address") }).parse(d))
  .handler(async ({ context, data }) => {
    const { db, allowed, limit, plan } = await readPlan(context.userId);
    if (!allowed) return { ok: false as const, error: "A Pro, Elite or Ultra plan is required." };
    const { data: rows } = await db.from("mt5_licenses").select("id,mt5_account").eq("user_id", context.userId).is("revoked_at", null);
    const list = rows ?? [];
    const ip = normalizeIp(data.ip);
    if (list.some((r: any) => r.mt5_account === ip)) return { ok: false as const, error: "This IP address already has a license." };
    // Fill an unbound license created after payment first.
    const free = list.find((r: any) => !r.mt5_account);
    if (free) {
      await db.from("mt5_licenses").update({ mt5_account: ip, plan_id: plan }).eq("id", free.id);
      return { ok: true as const };
    }
    if (list.length >= limit) return { ok: false as const, error: `Your plan allows ${limit} license${limit > 1 ? "s" : ""}. Delete one or upgrade.` };
    const { error } = await db.from("mt5_licenses").insert({ user_id: context.userId, license_key: newLicenseKey(), mt5_account: ip, plan_id: plan });
    return error ? { ok: false as const, error: "Could not create the license." } : { ok: true as const };
  });

export const revokeMt5License = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    // Permanent delete: the row is removed, so the key stops validating at the next check.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("mt5_licenses").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Could not delete the license.");
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

export type BotReportRow = { license_id: string; day: string; mt5_account: string; symbol: string; balance: number; equity: number; today_profit: number; trades_today: number; open_trades: number; open_lots: number; target_hit: boolean; updated_at: string };

export type BotSessionRow = { id: string; mt5_account: string; started_at: string; last_seen_at: string; ended_at: string | null; end_reason: string | null };

/** Bot Usage page: last 30 days of reports for the signed-in user's bots (RLS: own rows only). */
export const getBotUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db: _db, ...access } = await readPlan(context.userId);
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data } = await (context.supabase as any)
      .from("mt5_bot_reports")
      .select("license_id,day,mt5_account,symbol,balance,equity,today_profit,trades_today,open_trades,open_lots,target_hit,updated_at")
      .gte("day", since)
      .order("day", { ascending: true });
    const rows = ((data ?? []) as any[]).map((r) => ({ ...r, balance: Number(r.balance), equity: Number(r.equity), today_profit: Number(r.today_profit), open_lots: Number(r.open_lots) })) as BotReportRow[];
    const since3 = new Date(Date.now() - 3 * 86400000).toISOString();
    const { data: ses } = await (context.supabase as any)
      .from("mt5_bot_sessions")
      .select("id,mt5_account,started_at,last_seen_at,ended_at,end_reason")
      .or(`started_at.gte.${since3},last_seen_at.gte.${since3}`)
      .order("started_at", { ascending: false })
      .limit(200);
    return { plan: access.plan, allowed: access.allowed, limit: access.limit, dailyTarget: access.dailyTarget, rows, sessions: (ses ?? []) as BotSessionRow[] };
  });
