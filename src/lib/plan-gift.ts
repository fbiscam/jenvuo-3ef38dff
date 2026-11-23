/**
 * Plan promo codes ("plan gifts"): the Ops console gives one email address
 * Pro, Elite or Ultra for a fixed number of months. Redemption itself runs in
 * the database (`redeem_plan_gift`), locked to the recipient email.
 */
export type GiftPlanId = "pro" | "elite" | "ultra";

export const GIFT_PLANS: GiftPlanId[] = ["pro", "elite", "ultra"];
export const GIFT_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type GiftMonths = (typeof GIFT_MONTHS)[number];

export const GIFT_PLAN_PERKS: Record<GiftPlanId, { name: string; perks: string[] }> = {
  pro: {
    name: "Pro",
    perks: ["$40 API credit every month", "JX Bot with a 2% daily target on 1 IP", "8 hours of Terminal strategies a day", "3 API keys, 20 requests per minute"],
  },
  elite: {
    name: "Elite",
    perks: ["$70 API credit every month", "JX Bot with a 4% daily target on 3 IPs", "16 hours of Terminal strategies a day", "5 API keys, 40 requests per minute"],
  },
  ultra: {
    name: "Ultra",
    perks: ["$90 API credit every month", "JX Bot with a 6% daily target on 4 IPs", "24 hours of Terminal strategies a day", "7 API keys, 80 requests per minute"],
  },
};

export function isGiftPlan(v: unknown): v is GiftPlanId {
  return typeof v === "string" && (GIFT_PLANS as string[]).includes(v);
}

export function isGiftMonths(v: unknown): v is GiftMonths {
  return typeof v === "number" && (GIFT_MONTHS as readonly number[]).includes(v);
}

export function monthsLabel(m: number): string {
  return m === 1 ? "1 month" : `${m} months`;
}

// No 0/O/1/I so codes are easy to read and type from an email.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** e.g. JNV-ELITE-5M-7K3Q-X9PD */
export function makeGiftCode(plan: GiftPlanId, months: GiftMonths, random: (n: number) => Uint8Array): string {
  const bytes = random(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  return `JNV-${plan.toUpperCase()}-${months}M-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Codes are stored upper-case; matching ignores case and spaces. */
export function normalizeGiftCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Plan gift codes look like JNV-<PLAN>-<N>M-XXXX-XXXX. */
export function looksLikeGiftCode(code: string): boolean {
  return /^JNV-(PRO|ELITE|ULTRA)-([1-9]|1[0-2])M-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizeGiftCode(code));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function validGiftEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim()) && email.trim().length <= 254;
}
