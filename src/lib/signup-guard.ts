// Pure helpers for sign-up abuse checks (tested in signup-guard.test.ts).

/** Max accounts allowed for one custom/company email domain. */
export const MAX_ACCOUNTS_PER_COMPANY_DOMAIN = Infinity
/** Company-domain sign-ups allowed in one hour before it looks automated. */
export const COMPANY_DOMAIN_BURST_PER_HOUR = Infinity
/** Accounts created from one /24 (IPv4) or /48 (IPv6) network in 24h. */
export const MAX_ACCOUNTS_PER_SUBNET_DAY = Infinity
/** Shared networks do not impose an account count cap. */
export const MAX_ACCOUNTS_PER_IP = Infinity
export const EMAIL_ALREADY_LINKED = 'This email is already linked to another account. Please remove it from that account first, or sign in.'

export const EMAIL_ALREADY_REGISTERED = 'This email is already registered. Please sign in instead.'

/** Sign-up is refused for an address that already belongs to a confirmed account. */
export function signupEmailBlock(existing: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null | undefined): string | null {
  return existing?.email_confirmed_at || existing?.confirmed_at ? EMAIL_ALREADY_REGISTERED : null
}

/** Exact addresses are unique; different addresses may belong to the same person. */
export function emailOwnershipConflict(ownerId: string | null, requestingUserId?: string): boolean {
  return ownerId !== null && ownerId !== requestingUserId
}
/** Retained for audit-history consumers, never used to block signup. */
export const PERSON_LINK_WINDOW_DAYS = 30

/**
 * Shared IPs and fingerprints never prevent another account being created.
 */
export function personLinkVerdict(
  signup: { ip: string | null; browser: string | null; hardware: string | null },
  history: { user_id: string; ip: string | null; fingerprint: string | null }[],
): string | null {
  // Login history is for security notifications, not account ownership.
  void signup
  void history
  return null
}

/** Trusted tester IPs allowed more accounts than the normal caps (owner testing). */
const TRUSTED_SIGNUP_IPS: Record<string, number> = {
  '153.117.68.156': Infinity,
}

/** Account cap for a trusted IP, or null when the IP is not trusted. */
export function trustedSignupIpCap(ip: string): number | null {
  const v = (ip || '').trim()
  return Object.prototype.hasOwnProperty.call(TRUSTED_SIGNUP_IPS, v) ? TRUSTED_SIGNUP_IPS[v] : null
}

/** Splits `<browserHash>_<hardwareHash>` sent by the browser. */
export function splitFingerprint(raw: string): { browser: string; hardware: string | null } {
  const value = (raw || '').trim()
  const [browser = '', hardware = ''] = value.split('_')
  return {
    browser: browser.slice(0, 128),
    hardware: /^[a-f0-9]{16,64}$/.test(hardware) ? hardware : null,
  }
}

/** Network prefix used to spot many accounts from one network block. */
export function ipSubnet(ip: string): string | null {
  const v = (ip || '').trim()
  if (!v) return null
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return v.split('.').slice(0, 3).join('.') + '.'
  if (v.includes(':')) {
    const groups = v.split(':').filter(Boolean)
    if (groups.length < 3) return null
    return groups.slice(0, 3).join(':').toLowerCase() + ':'
  }
  return null
}

/** Mail servers used by temp-mail services; a domain pointing here is disposable. */
const DISPOSABLE_MX_PATTERNS: RegExp[] = [
  /mailinator\.com$/i, /yopmail\.(com|net|fr)$/i, /guerrillamail\./i, /sharklasers\.com$/i,
  /temp-mail\.(org|io)$/i, /tempmail\./i, /mail\.tm$/i, /mail\.gw$/i, /tempail\.com$/i,
  /emailondeck\.com$/i, /burnermail\.io$/i, /10minutemail\./i, /dispostable\.com$/i,
  /maildrop\.cc$/i, /mailnesia\.com$/i, /getnada\.com$/i, /trashmail\./i, /mohmal\./i,
  /1secmail\./i, /emailfake\.com$/i, /generator\.email$/i, /inboxkitten\.com$/i,
]

export function isDisposableMx(host: string): boolean {
  const h = (host || '').trim().replace(/\.$/, '').toLowerCase()
  return !!h && DISPOSABLE_MX_PATTERNS.some((re) => re.test(h))
}

export function companyDomainVerdict(totalAccounts: number, lastHour: number): string | null {
  if (totalAccounts >= MAX_ACCOUNTS_PER_COMPANY_DOMAIN) {
    return `This company email domain already has the maximum of ${MAX_ACCOUNTS_PER_COMPANY_DOMAIN} accounts.`
  }
  if (lastHour >= COMPANY_DOMAIN_BURST_PER_HOUR) {
    return 'Too many sign-ups from this company domain right now. Please try again later.'
  }
  return null
}
