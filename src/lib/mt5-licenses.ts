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

/** Daily/monthly target for a plan. Every account (owner included) follows its plan limit. */
export function targetsFor(plan: Mt5PlanId, _userId?: string | null) {
  return { daily: dailyTarget(plan), monthly: MT5_PLANS[plan].monthlyTarget };
}

/** JX Bot unlocks only on an active, paid (non-trial) plan. */
export function isPaidBotSub(sub: Sub, now = Date.now()) {
  if (!sub || sub.is_trial || sub.status !== "active") return false;
  if (sub.current_period_end && Date.parse(sub.current_period_end) <= now) return false;
  return isMt5Plan(String(sub.plan_id || "").toLowerCase());
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

/** The bot reports about once a minute; the license "last check" time is rewritten at most this often. */
export const LICENSE_TOUCH_EVERY_MS = 5 * 60_000;
export function licenseCheckDue(lastIso: string | null | undefined, now = Date.now(), every = LICENSE_TOUCH_EVERY_MS) {
  if (!lastIso) return true;
  const t = Date.parse(lastIso);
  return !Number.isFinite(t) || now - t >= every;
}

/** Only active IP bindings consume an IP slot; legacy account-only rows can be reused. */
export function countIpLicenses(licenses: { mt5_account: string | null; revoked_at: string | null }[]) {
  return licenses.filter((l) => !l.revoked_at && parseBinding(l.mt5_account).ip).length;
}

export type ValidateResult =
  | { valid: true; plan: Mt5PlanId; daily_target: number; monthly_target: number; expires_at: string | null; bind: boolean }
  | { valid: false; reason: "malformed" | "not_found" | "revoked" | "ip_mismatch" | "account_mismatch" | "expired" | "no_plan" };

/**
 * Pure license check. `enteredIp` is what the user typed in the bot, `callerIp` is the IP the server sees.
 * Both must equal the IP registered on the website; the first MT5 account on that IP is locked in.
 * An active paid plan or the 14-day free trial makes it valid; credit never does.
 */
export function evaluateIpLicense(enteredIp: string, callerIp: string, account: string, lic: Lic | null, sub: Sub, now = Date.now(), foundingBot = false): ValidateResult {
  const ip = normalizeIp(enteredIp);
  if (!ip || !MT5_ACCOUNT_RE.test(account)) return { valid: false, reason: "malformed" };
  if (!lic) return { valid: false, reason: "not_found" };
  if (lic.revoked_at) return { valid: false, reason: "revoked" };
  const b = parseBinding(lic.mt5_account);
  if (b.ip !== ip || normalizeIp(callerIp) !== ip) return { valid: false, reason: "ip_mismatch" };
  if (b.account && b.account !== account) return { valid: false, reason: "account_mismatch" };
  // Verified Founding members (within their 30 days) run the bot on their Founding plan (Pro or Elite).
  if (foundingBot && !(sub && isPaidBotSub(sub, now))) {
    const fp = String(sub?.plan_id || "").toLowerCase() === "elite" ? "elite" : "pro";
    const t = targetsFor(fp, lic.user_id);
    return { valid: true, plan: fp, daily_target: t.daily, monthly_target: t.monthly, expires_at: null, bind: !b.account };
  }
  const plan = String(sub?.plan_id || "").toLowerCase();
  if (!sub || !isPaidBotSub(sub, now)) return { valid: false, reason: sub?.plan_id && plan !== "free" && !sub?.is_trial ? "expired" : "no_plan" };
  if (!isMt5Plan(plan)) return { valid: false, reason: "no_plan" };
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

/** Fixed daily target as % of the day's starting balance (user cannot change it). */
export const DAILY_TARGET_PCT: Record<Mt5PlanId, number> = { pro: 2, elite: 4, ultra: 6 };
/** Fixed daily drawdown guard, % of the day's starting balance. */
export const DAILY_DRAWDOWN_PCT = 4.7;

/**
 * Server-enforced daily stop for one account. Start balance = balance − today's profit.
 * Stops when profit reaches the plan % target or loss reaches the 4.7% drawdown guard.
 */
export function dailyStopFor(plan: Mt5PlanId, balance: number, todayProfit: number) {
  const start = Math.max(0, (Number(balance) || 0) - (Number(todayProfit) || 0));
  const round = (n: number) => Math.round(n * 100) / 100;
  const target = round((start * DAILY_TARGET_PCT[plan]) / 100);
  const drawdown = round((start * DAILY_DRAWDOWN_PCT) / 100);
  const p = Number(todayProfit) || 0;
  return { start: round(start), target, drawdown, stop: start > 0 && (p >= target || p <= -drawdown), reason: p >= target ? "target" : p <= -drawdown ? "drawdown" : null };
}

/**
 * Stored daily profit is per UTC day from the closed balance: the day starts at the previous day's
 * closing balance (first ever day: equity − the EA's profit), so a broker midnight reset can't wipe it.
 */
export function reportDayStart(existingStart: number | null | undefined, prevBalance: number | null | undefined, equity: number, eaProfit: number) {
  const ok = (n: unknown): n is number => n !== null && n !== undefined && Number.isFinite(Number(n));
  if (ok(existingStart)) return Number(existingStart);
  if (ok(prevBalance)) return Number(prevBalance);
  return Math.round(((Number(equity) || 0) - (Number(eaProfit) || 0)) * 100) / 100;
}
export const reportDayProfit = (balance: number, start: number) => Math.round(((Number(balance) || 0) - start) * 100) / 100;

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
