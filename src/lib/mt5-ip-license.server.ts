import { evaluateIpLicense, formatBinding, normalizeIp, requestIp, type ValidateResult } from "@/lib/mt5-licenses";

/** Find the active license registered for an IP (binding "ip" or "ip#account"). */
export async function findLicenseByIp(db: any, ip: string) {
  const exact = await db.from("mt5_licenses").select("id,user_id,mt5_account,revoked_at").is("revoked_at", null).eq("mt5_account", ip).limit(1).maybeSingle();
  if (exact.data) return exact.data;
  const bound = await db.from("mt5_licenses").select("id,user_id,mt5_account,revoked_at").is("revoked_at", null).like("mt5_account", `${ip}#%`).limit(1).maybeSingle();
  return bound.data ?? null;
}

/** Shared by validate + report: check the bot's IP/account and lock the first account in. */
export async function checkBotByIp(body: any, headers: Headers): Promise<{ r: ValidateResult; lic: any; account: string }> {
  const enteredIp = normalizeIp(String(body?.ip ?? "").slice(0, 45));
  const account = String(body?.mt5_account ?? "").trim().slice(0, 20);
  const pre = evaluateIpLicense(enteredIp, enteredIp, account, { mt5_account: enteredIp, revoked_at: null }, null);
  if (!pre.valid && pre.reason === "malformed") return { r: pre, lic: null, account };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const lic = await findLicenseByIp(db, enteredIp);
  let sub = null;
  if (lic) {
    const { data } = await db.from("user_subscriptions").select("plan_id,status,is_trial,current_period_end").eq("user_id", lic.user_id).maybeSingle();
    sub = data ?? null;
  }
  const r = evaluateIpLicense(enteredIp, requestIp(headers), account, lic, sub);
  if (r.valid) {
    await db.from("mt5_licenses").update({ last_validated_at: new Date().toISOString(), ...(r.bind ? { mt5_account: formatBinding(enteredIp, account) } : {}) }).eq("id", lic.id);
  }
  return { r, lic, account };
}
