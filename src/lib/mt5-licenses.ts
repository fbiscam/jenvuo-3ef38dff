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

type Lic = { mt5_account: string | null; revoked_at: string | null };
type Sub = { plan_id: string | null; status: string | null; is_trial: boolean | null; current_period_end: string | null } | null;

export type ValidateResult =
  | { valid: true; plan: Mt5PlanId; daily_target: number; monthly_target: number; expires_at: string | null; bind: boolean }
  | { valid: false; reason: "malformed" | "not_found" | "revoked" | "mt5_mismatch" | "expired" | "no_plan" };

/** Pure license check. Only a paid, active plan (not a trial, not credit) makes a key valid. */
export function evaluateLicense(key: string, account: string, lic: Lic | null, sub: Sub, now = Date.now()): ValidateResult {
  if (!LICENSE_KEY_RE.test(key) || !MT5_ACCOUNT_RE.test(account)) return { valid: false, reason: "malformed" };
  if (!lic) return { valid: false, reason: "not_found" };
  if (lic.revoked_at) return { valid: false, reason: "revoked" };
  if (lic.mt5_account && lic.mt5_account !== account) return { valid: false, reason: "mt5_mismatch" };
  const plan = String(sub?.plan_id || "").toLowerCase();
  const active = sub && (sub.status === "active" || sub.status === "trialing") && !sub.is_trial;
  if (!active || !isMt5Plan(plan)) return { valid: false, reason: sub?.plan_id && plan !== "free" ? "expired" : "no_plan" };
  if (sub.current_period_end && Date.parse(sub.current_period_end) <= now) return { valid: false, reason: "expired" };
  return {
    valid: true,
    plan,
    daily_target: dailyTarget(plan),
    monthly_target: MT5_PLANS[plan].monthlyTarget,
    expires_at: sub.current_period_end,
    bind: !lic.mt5_account,
  };
}
