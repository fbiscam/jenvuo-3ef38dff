/** MT5 JX Bot plans: profit targets and license (MT5 account) limits per plan. */
export const MT5_PLANS = {
  pro: { name: "Pro", monthlyTarget: 600, licenses: 1 },
  elite: { name: "Elite", monthlyTarget: 1500, licenses: 2 },
  ultra: { name: "Ultra", monthlyTarget: 3000, licenses: 5 },
} as const;

export type Mt5PlanId = keyof typeof MT5_PLANS;

export function isMt5Plan(id: string | null | undefined): id is Mt5PlanId {
  return !!id && id in MT5_PLANS;
}

/** Daily target = monthly target / 20 trading days. */
export function dailyTarget(plan: Mt5PlanId) {
  return MT5_PLANS[plan].monthlyTarget / 20;
}

/** Per-account target overrides (owner account imgakhar@gmail.com: $1,000/day). Keyed by user id. */
const TARGET_OVERRIDES: Record<string, { daily: number; monthly: number }> = {
  "5af751fb-de3b-4a24-aefd-aed53ef44378": { daily: 1000, monthly: 20000 },
  // malik00902@dawntv.co.uk (test account): $500/day
  "3281e6c3-39f0-4a13-9085-ab5a595fc91b": { daily: 500, monthly: 10000 },
};

/** Daily/monthly target for a plan, with any per-account override applied. */
export function targetsFor(plan: Mt5PlanId, userId?: string | null) {
  const o = userId ? TARGET_OVERRIDES[userId] : undefined;
  return o ? { daily: o.daily, monthly: o.monthly } : { daily: dailyTarget(plan), monthly: MT5_PLANS[plan].monthlyTarget };
}

export function licenseLimit(plan: string | null | undefined) {
  return isMt5Plan(plan) ? MT5_PLANS[plan].licenses : 0;
}

export const LICENSE_KEY_RE = /^JENV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
export const MT5_ACCOUNT_RE = /^\d{3,15}$/;

export function newLicenseKey(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = rand(16);
  const s = Array.from(b, (x) => abc[x % abc.length]).join("");
  return `JENV-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

// `mt5_account` on a license row stores the binding "ip" or "ip#mt5account": the user registers an IP on the website,
// enters the same IP in the bot, and the first MT5 account that runs on it is locked in (1 IP = 1 account).
type Lic = { mt5_account: string | null; revoked_at: string | null; user_id?: string | null };
type Sub = { plan_id: string | null; status: string | null; is_trial: boolean | null; current_period_end: string | null } | null;

export const IPV4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
export const IPV6_RE = /^[0-9a-f:]{2,39}$/i;
export function normalizeIp(v: string | null | undefined) {
  const s = String(v ?? "").split(",")[0].trim().toLowerCase().replace(/^::ffff:/, "");
  return IPV4_RE.test(s) || (s.includes(":") && IPV6_RE.test(s)) ? s : "";
}

/** Read a license binding. Legacy digit-only values (old MT5-account licenses) have no IP. */
export function parseBinding(v: string | null | undefined): { ip: string | null; account: string | null } {
  const [ipPart, acc] = String(v ?? "").split("#");
  const ip = normalizeIp(ipPart);
  return { ip: ip || null, account: ip && acc && MT5_ACCOUNT_RE.test(acc) ? acc : null };
}
export const formatBinding = (ip: string, account?: string | null) => (account ? `${ip}#${account}` : ip);

export type ValidateResult =
  | { valid: true; plan: Mt5PlanId; daily_target: number; monthly_target: number; expires_at: string | null; bind: boolean }
  | { valid: false; reason: "malformed" | "not_found" | "revoked" | "ip_mismatch" | "account_mismatch" | "expired" | "no_plan" };

/**
 * Pure license check. `enteredIp` is what the user typed in the bot, `callerIp` is the IP the server sees.
 * Both must equal the IP registered on the website; the first MT5 account on that IP is locked in.
 * An active paid plan or the 14-day free trial makes it valid; credit never does.
 */
export function evaluateIpLicense(enteredIp: string, callerIp: string, account: string, lic: Lic | null, sub: Sub, now = Date.now()): ValidateResult {
  const ip = normalizeIp(enteredIp);
  if (!ip || !MT5_ACCOUNT_RE.test(account)) return { valid: false, reason: "malformed" };
  if (!lic) return { valid: false, reason: "not_found" };
  if (lic.revoked_at) return { valid: false, reason: "revoked" };
  const b = parseBinding(lic.mt5_account);
  if (b.ip !== ip || normalizeIp(callerIp) !== ip) return { valid: false, reason: "ip_mismatch" };
  if (b.account && b.account !== account) return { valid: false, reason: "account_mismatch" };
  const plan = String(sub?.plan_id || "").toLowerCase();
  const active = sub && (sub.status === "active" || sub.status === "trialing");
  if (!active || !isMt5Plan(plan)) return { valid: false, reason: sub?.plan_id && plan !== "free" ? "expired" : "no_plan" };
  if (sub.current_period_end && Date.parse(sub.current_period_end) <= now) return { valid: false, reason: "expired" };
  const t = targetsFor(plan, lic.user_id);
  return {
    valid: true,
    plan,
    daily_target: t.daily,
    monthly_target: t.monthly,
    expires_at: sub.current_period_end,
    bind: !b.account,
  };
}

/** Caller IP as seen by the server (Cloudflare first). */
export function requestIp(headers: Headers) {
  return normalizeIp(headers.get("cf-connecting-ip") || headers.get("x-forwarded-for") || headers.get("x-real-ip"));
}

/** Plan daily target is shared by every account on the plan: stop all bots once their combined profit today reaches it. */
export function sharedTargetStatus(dailyTarget: number, todayProfits: number[], anyHit = false) {
  const combined = Math.round(todayProfits.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) * 100) / 100;
  return { combined, stop: anyHit || (dailyTarget > 0 && combined >= dailyTarget) };
}

/** A bot that has not reported for this long is treated as off (it reports once a minute). */
export const SESSION_GAP_MS = 3 * 60 * 1000;

type SessionLike = { last_seen_at: string; ended_at: string | null } | null;

/** Should a bot report extend the open ON session or start a new one? */
export function sessionStep(last: SessionLike, now: number, event?: string): "extend" | "new" {
  if (event === "start" || !last || last.ended_at) return "new";
  return now - Date.parse(last.last_seen_at) > SESSION_GAP_MS ? "new" : "extend";
}

export type OffCause = { label: string; by: "you" | "pc" | "bot" | "none" };

/** Why a bot session ended, in plain words, and who caused it. */
export function sessionEndCause(s: { last_seen_at: string; ended_at: string | null; end_reason: string | null }, now: number): OffCause {
  if (!s.ended_at && now - Date.parse(s.last_seen_at) <= SESSION_GAP_MS) return { label: "Running", by: "none" };
  switch (s.end_reason) {
    case "remove": return { label: "You removed the bot from the chart", by: "you" };
    case "close": return { label: "MT5 was closed", by: "you" };
    case "chartclose": return { label: "The chart was closed", by: "you" };
    case "account": return { label: "MT5 account was changed", by: "you" };
    case "parameters": case "recompile": case "template": case "chartchange": return { label: "Bot settings or chart changed (bot restarted)", by: "you" };
    case "license": return { label: "Bot stopped: license not valid", by: "bot" };
    case "initfailed": return { label: "Bot could not start", by: "bot" };
    default: return { label: "Connection lost: PC off, asleep or no internet", by: "pc" };
  }
}

/**
 * Bot Usage "Delete account": an MT5 account can be removed from the history only when
 * it is NOT live on a JX Bot license (bound on an active IP license, or the account
 * an unbound active license is about to lock in) and is not running right now.
 */
export const BOT_ONLINE_MS = 3 * 60 * 1000;
export function botAccountDeleteBlock(
  account: string,
  licenses: { id: string; mt5_account: string | null; revoked_at: string | null }[],
  reports: { license_id: string; mt5_account: string; updated_at: string }[],
  sessions: { mt5_account: string; last_seen_at: string; ended_at: string | null }[],
  now = Date.now(),
): null | "live_license" | "running" {
  const active = licenses.filter((l) => !l.revoked_at);
  if (active.some((l) => parseBinding(l.mt5_account).account === account)) return "live_license";
  const unbound = new Set(active.filter((l) => !parseBinding(l.mt5_account).account).map((l) => l.id));
  // An unbound (IP-only) license is live only for the account that reported on it most recently.
  for (const id of unbound) {
    const last = reports.filter((r) => r.license_id === id).reduce<{ a: string; t: number } | null>((m, r) => {
      const t = Date.parse(r.updated_at) || 0;
      return !m || t > m.t ? { a: r.mt5_account, t } : m;
    }, null);
    if (last?.a === account) return "live_license";
  }
  const lastReport = reports.filter((r) => r.mt5_account === account).reduce((m, r) => Math.max(m, Date.parse(r.updated_at) || 0), 0);
  const open = sessions.some((s) => s.mt5_account === account && !s.ended_at && now - (Date.parse(s.last_seen_at) || 0) < BOT_ONLINE_MS);
  if (open || now - lastReport < BOT_ONLINE_MS) return "running";
  return null;
}
