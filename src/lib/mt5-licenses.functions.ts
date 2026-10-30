import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMt5Plan, licenseLimit, newLicenseKey, normalizeIp, parseBinding, targetsFor } from "./mt5-licenses";

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
    // 1 IP = 1 license across every user.
    const { findLicenseByIp } = await import("./mt5-ip-license.server");
    if (await findLicenseByIp(db, ip)) return { ok: false as const, error: "This IP address already has a license." };
    // Fill an unbound license (no IP yet, incl. old MT5-account licenses) first.
    const free = list.find((r: any) => !parseBinding(r.mt5_account).ip);
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
    const { botAccountDeleteBlock } = await import("./mt5-licenses");
    const { data: lic } = await _db.from("mt5_licenses").select("id,mt5_account,revoked_at").eq("user_id", context.userId);
    const sessions = (ses ?? []) as BotSessionRow[];
    const deleteBlock: Record<string, "live_license" | "running" | null> = {};
    for (const acc of new Set([...rows.map((r) => r.mt5_account), ...sessions.map((s) => s.mt5_account)])) deleteBlock[acc] = botAccountDeleteBlock(acc, lic ?? [], rows, sessions);
    return { plan: access.plan, allowed: access.allowed, limit: access.limit, dailyTarget: access.dailyTarget, rows, sessions, deleteBlock };
  });

/** Bot Usage: remove an MT5 account's history. Refused while it is live on a JX Bot license or running. */
export const deleteBotAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ account: z.string().trim().regex(/^\d{3,20}$/) }).parse(d))
  .handler(async ({ context, data }) => {
    const { botAccountDeleteBlock } = await import("./mt5-licenses");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const uid = context.userId;
    const [{ data: lic }, { data: rep }, { data: ses }] = await Promise.all([
      db.from("mt5_licenses").select("id,mt5_account,revoked_at").eq("user_id", uid),
      db.from("mt5_bot_reports").select("license_id,mt5_account,updated_at").eq("user_id", uid).eq("mt5_account", data.account),
      db.from("mt5_bot_sessions").select("mt5_account,last_seen_at,ended_at").eq("user_id", uid).eq("mt5_account", data.account),
    ]);
    if (!(rep ?? []).length && !(ses ?? []).length) return { ok: false as const, error: "Account not found." };
    const block = botAccountDeleteBlock(data.account, lic ?? [], rep ?? [], ses ?? []);
    if (block === "live_license") return { ok: false as const, error: "This account is live on your JX Bot plan. Delete its IP on the JX Bot page first." };
    if (block === "running") return { ok: false as const, error: "This account's bot is running. Remove the bot from the chart first." };
    const r1 = await db.from("mt5_bot_reports").delete().eq("user_id", uid).eq("mt5_account", data.account);
    const r2 = await db.from("mt5_bot_sessions").delete().eq("user_id", uid).eq("mt5_account", data.account);
    if (r1.error || r2.error) return { ok: false as const, error: "Could not delete the account." };
    return { ok: true as const };
  });
