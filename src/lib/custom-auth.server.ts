import { createClient } from '@supabase/supabase-js'
import type { Session, User } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { sendCustomAuthEmail } from './custom-auth-email.server'

type OtpPurpose = 'signup' | 'recovery' | 'login' | 'second_step' | 'email_2fa_setup'

type OtpRow = {
  id: string
  email: string
  purpose: OtpPurpose
  code_hash: string
  full_name: string | null
  expires_at: string
  consumed_at: string | null
  attempts: number
}

export type CustomAuthResult = {
  ok: boolean
  error?: string
  session?: Pick<Session, 'access_token' | 'refresh_token' | 'expires_in' | 'expires_at' | 'token_type'> & {
    user: Session['user']
  }
}

const OTP_TTL_MINUTES = 15
const MAX_ATTEMPTS = 5

const encoder = new TextEncoder()

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

// Gmail ignores dots and "+tags", most providers ignore "+tags": one inbox
// can otherwise open many accounts (a.b+1@gmail.com, ab+2@gmail.com, ...).
export function canonicalEmail(email: string): string {
  const [rawLocal = '', rawDomain = ''] = normalizeEmail(email).split('@')
  let domain = rawDomain === 'googlemail.com' ? 'gmail.com' : rawDomain
  let local = rawLocal.split('+')[0]
  if (domain === 'gmail.com') local = local.replace(/\./g, '')
  return `${local}@${domain}`
}

async function assertNoEmailAlias(email: string) {
  if (await emailAliasTaken(email)) {
    throw new Error('An account already exists for this email inbox. Please sign in to your existing account.')
  }
}

/** True when another spelling of the same inbox (Gmail dots, +tags) already has an account. */
async function emailAliasTaken(email: string): Promise<boolean> {
  const canonical = canonicalEmail(email)
  const [local, domain] = canonical.split('@')
  if (!local || !domain) return false
  const domains = domain === 'gmail.com' ? ['gmail.com', 'googlemail.com'] : [domain]
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  for (const d of domains) {
    const pattern = `${local.replace(/[%_\\]/g, '').split('').join('%')}%@${d}`
    const { data } = await (supabaseAdmin as any).from('profiles').select('email').ilike('email', pattern).limit(50)
    for (const row of (data ?? []) as { email: string | null }[]) {
      if (row.email && normalizeEmail(row.email) !== normalizeEmail(email) && canonicalEmail(row.email) === canonical) {
        return true
      }
    }
  }
  return false
}

function publicSignupEnabled(): boolean {
  // Public signup is open; the Terminal itself stays locked to approved
  // Founding Program members (see terminal-access.server.ts).
  return true
}

function assertPublicSignupOpen() {
  if (!publicSignupEnabled()) {
    throw new Error('Jenvu is invite only. Apply to the Founding Trader Program for access.')
  }
}

function serverSecret() {
  const secret = process.env.LOVABLE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Server is missing secure auth configuration.')
  return secret
}

function toBase64(bytes: ArrayBuffer | Uint8Array) {
  return Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString('base64')
}

async function hmacCode(email: string, purpose: OtpPurpose, code: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(serverSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${purpose}:${email}:${code}`))
  return toBase64(signature)
}

function safeEqual(a: string, b: string) {
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  const max = Math.max(left.length, right.length)
  for (let i = 0; i < max; i += 1) diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  return diff === 0
}

function publicAuthClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  })
}

/** Email + password sign-in done on the server (after the Cloudflare check). */
export async function passwordSignIn(email: string, password: string) {
  const { data, error } = await publicAuthClient().auth.signInWithPassword({ email, password })
  if (error || !data.session) return { ok: false as const, error: error?.message || 'Sign-in failed.' }
  return {
    ok: true as const,
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
  }
}

function generateSixDigitCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(1))
  return String(bytes[0] % 1_000_000).padStart(6, '0')
}

async function latestValidOtp(email: string, purpose: OtpPurpose): Promise<OtpRow | null> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data, error } = await (supabaseAdmin as any)
    .from('custom_auth_otps')
    .select('id,email,purpose,code_hash,full_name,expires_at,consumed_at,attempts')
    .eq('email', email)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as OtpRow | null) ?? null
}

async function verifyCustomOtp(email: string, purpose: OtpPurpose, code: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const row = await latestValidOtp(email, purpose)
  if (!row) return { ok: false as const, error: 'Code expired. Tap Resend.' }
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: 'Too many attempts. Tap Resend.' }

  const expected = await hmacCode(email, purpose, code)
  if (!safeEqual(expected, row.code_hash)) {
    await (supabaseAdmin as any)
      .from('custom_auth_otps')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id)
    return { ok: false as const, error: 'Invalid code. Try again.' }
  }

  return { ok: true as const, row }
}

async function consumeOtp(id: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  await (supabaseAdmin as any)
    .from('custom_auth_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', id)
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    const found = data.users.find((user) => user.email?.toLowerCase() === email)
    if (found) return found
    if (!data.nextPage) break
  }
  return null
}

const SIGNUP_IP_LIMIT_PER_HOUR = 5
const SIGNUP_DOMAIN_LIMIT_PER_HOUR = 20
const MAX_ACCOUNTS_PER_DEVICE = 1

// Public email providers — skip domain-level rate limit (millions of legit users share these).
// Abuse from these is caught by device fingerprint + IP caps instead.
const PUBLIC_EMAIL_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'hotmail.co.uk',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'protonmail.com', 'proton.me', 'pm.me',
  'zoho.com', 'gmx.com', 'gmx.de', 'mail.com', 'yandex.com', 'yandex.ru',
  'fastmail.com', 'tutanota.com', 'hey.com',
])

function assertSignupSignals(input: { country?: string; fingerprint?: string; userAgent?: string }) {
  if (!input.fingerprint || input.fingerprint.length < 32) throw new Error('Device verification failed. Refresh the page and try again.')
  const userAgent = (input.userAgent || '').trim()
  if (userAgent.length < 10 || /^(curl|wget|python-requests|postmanruntime|insomnia)\b/i.test(userAgent)) {
    throw new Error('This browser could not be verified. Please use a current web browser.')
  }
}

// Blocks sign-ups from VPN / proxy / Tor / hosting networks (proxycheck.io).
// Fails open on lookup errors so a provider outage never blocks every sign-up.
async function assertNotVpn(ip: string | undefined) {
  const addr = (ip || '').trim()
  if (!addr || addr === '127.0.0.1' || addr === '::1') return
  const { trustedSignupIpCap } = await import('./signup-guard')
  if (trustedSignupIpCap(addr) != null) return
  try {
    const key = process.env.PROXYCHECK_API_KEY
    const url = `https://proxycheck.io/v2/${encodeURIComponent(addr)}?vpn=3&risk=1${key ? `&key=${encodeURIComponent(key)}` : ''}`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return
    const json: any = await res.json()
    const info = json?.[addr]
    if (!info) return
    const type = String(info.type || '').toLowerCase()
    if (info.proxy === 'yes' || info.vpn === 'yes' || type === 'vpn' || type === 'tor' || type === 'hosting') {
      throw new Error('VPN_BLOCKED')
    }
  } catch (e) {
    if ((e as Error)?.message === 'VPN_BLOCKED') {
      throw new Error('Account creation is not allowed over a VPN or proxy. Please turn it off and try again.')
    }
  }
}

async function assertDeviceUnderCap(ip: string | undefined, rawFingerprint: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { splitFingerprint, ipSubnet, MAX_ACCOUNTS_PER_SUBNET_DAY, MAX_ACCOUNTS_PER_IP, PERSON_LINK_WINDOW_DAYS, personLinkVerdict, trustedSignupIpCap } = await import('./signup-guard')
  const admin = supabaseAdmin as any
  // Trusted tester IPs: skip device/subnet caps, enforce only their own IP cap.
  const trustedCap = trustedSignupIpCap(ip || '')
  if (trustedCap != null) {
    const normalizedTrustedIp = (ip || '').trim().slice(0, 100)
    const { data: trustedRows } = await admin.from('account_devices').select('user_id').eq('ip', normalizedTrustedIp)
    if (new Set((trustedRows ?? []).map((r: { user_id: string }) => r.user_id)).size >= trustedCap) {
      throw new Error('This network has reached its account limit. Please sign in to your existing account.')
    }
    return
  }
  const { browser, hardware } = splitFingerprint(rawFingerprint)
  const tooMany = 'An account is already linked to this device. Please sign in to your existing account.'
  const countUsers = (rows: { user_id: string }[] | null) => new Set((rows ?? []).map((r) => r.user_id)).size
  for (const fp of [browser, rawFingerprint]) {
    const { data } = await admin.from('account_devices').select('user_id').eq('fingerprint', fp)
    if (countUsers(data) >= MAX_ACCOUNTS_PER_DEVICE) throw new Error(tooMany)
  }
  if (hardware) {
    const { data } = await admin.from('account_devices').select('user_id').eq('hw_fingerprint', hardware)
    if (countUsers(data) >= MAX_ACCOUNTS_PER_DEVICE) throw new Error(tooMany)
  }
  const normalizedIp = (ip || '').trim().slice(0, 100)
  if (normalizedIp) {
    const { data: ipRows } = await admin.from('account_devices').select('user_id').eq('ip', normalizedIp)
    if (countUsers(ipRows) >= MAX_ACCOUNTS_PER_IP) throw new Error('An account is already linked to this network. Please sign in to your existing account.')
    const subnet = ipSubnet(normalizedIp)
    if (subnet) {
      const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
      const { data: netRows } = await admin.from('account_devices').select('user_id').like('ip', `${subnet}%`).gte('created_at', since)
      if (countUsers(netRows) >= MAX_ACCOUNTS_PER_SUBNET_DAY) throw new Error('Too many new accounts from this network today. Please try again tomorrow.')
    }
  }
  // Person link: same IP / device already used to sign in to another account.
  const sinceLink = new Date(Date.now() - PERSON_LINK_WINDOW_DAYS * 86400000).toISOString()
  const history: { user_id: string; ip: string | null; fingerprint: string | null }[] = []
  if (normalizedIp) {
    const { data } = await admin.from('login_events').select('user_id,ip,fingerprint').eq('ip', normalizedIp).gte('created_at', sinceLink).limit(5)
    history.push(...(data ?? []))
  }
  const fps = [browser, hardware].filter((v): v is string => !!v)
  if (fps.length) {
    const { data } = await admin.from('login_events').select('user_id,ip,fingerprint').in('fingerprint', fps).gte('created_at', sinceLink).limit(5)
    history.push(...(data ?? []))
  }
  const verdict = personLinkVerdict({ ip: normalizedIp || null, browser: browser || null, hardware }, history)
  if (verdict) throw new Error(verdict)
}

// Looks up the domain's mail servers (DNS over HTTPS). Blocks domains with no
// mail server or whose mail goes to a temp-mail service. Fails open on errors.
async function assertRealMailDomain(domain: string) {
  if (!domain || PUBLIC_EMAIL_PROVIDERS.has(domain)) return
  const { isDisposableMx } = await import('./signup-guard')
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return
    const json: any = await res.json()
    if (json?.Status === 3) throw new Error('NO_DOMAIN')
    const hosts: string[] = (json?.Answer ?? []).filter((a: any) => a.type === 15).map((a: any) => String(a.data).split(' ').pop() || '')
    if (json?.Status === 0 && hosts.length === 0) throw new Error('NO_MX')
    if (hosts.some(isDisposableMx)) throw new Error('DISPOSABLE')
  } catch (e) {
    const m = (e as Error)?.message
    if (m === 'NO_DOMAIN' || m === 'NO_MX') throw new Error('This email domain cannot receive mail. Please use a real email address.')
    if (m === 'DISPOSABLE') throw new Error('Disposable email addresses are not allowed. Please use a permanent email.')
  }
}

async function assertCompanyDomainCap(domain: string) {
  if (!domain || PUBLIC_EMAIL_PROVIDERS.has(domain)) return
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { companyDomainVerdict } = await import('./signup-guard')
  const admin = supabaseAdmin as any
  const { count: total } = await admin.from('profiles').select('id', { count: 'exact', head: true }).ilike('email', `%@${domain}`)
  const since = new Date(Date.now() - 60 * 60_000).toISOString()
  const { data: recent } = await admin.from('profiles').select('id').ilike('email', `%@${domain}`).gte('created_at', since)
  const verdict = companyDomainVerdict(total ?? 0, (recent ?? []).length)
  if (verdict) throw new Error(verdict)
}

export async function createSignupOtp(input: { email: string; password?: string; fullName?: string; siteUrl?: string; ip?: string; country?: string; fingerprint: string; userAgent?: string }) {
  assertPublicSignupOpen()
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const email = normalizeEmail(input.email)

  // 1. Block disposable / throwaway email providers.
  const { isDisposableEmail } = await import('./disposable-email-domains')
  if (isDisposableEmail(email)) {
    throw new Error('Disposable email addresses are not allowed. Please use a permanent email.')
  }

  if (input.password) await assertPasswordNotLeaked(input.password)
  assertSignupSignals(input)
  // Taken inboxes get the same "code sent" answer as new ones (the owner is
  // emailed a sign-in note instead), so this step can't reveal who has an account.
  const aliasTaken = await emailAliasTaken(email)
  const signupDomain = email.split('@')[1]?.toLowerCase().trim() || ''
  await assertRealMailDomain(signupDomain)
  await assertCompanyDomainCap(signupDomain)
  await assertNotVpn(input.ip)
  await assertDeviceUnderCap(input.ip, input.fingerprint)

  // 3. Per-email-domain rate limit: skipped for public providers (gmail/yahoo/etc.);
  //    applied only to custom/corporate domains where bulk abuse is actually meaningful.
  const domain = email.split('@')[1]?.toLowerCase().trim()
  const since = new Date(Date.now() - 60 * 60_000).toISOString()
  if (domain && !PUBLIC_EMAIL_PROVIDERS.has(domain)) {
    const { count: domainCount, error: domainErr } = await (supabaseAdmin as any)
      .from('signup_attempts')
      .select('id', { count: 'exact', head: true })
      .ilike('email', `%@${domain}`)
      .gte('created_at', since)
    if (!domainErr && typeof domainCount === 'number' && domainCount >= SIGNUP_DOMAIN_LIMIT_PER_HOUR) {
      throw new Error(`Too many signup attempts from ${domain} recently. Please try again in an hour.`)
    }
  }

  // 4. Per-IP signup rate limit: at most N attempts per hour from one IP.
  const ip = (input.ip || '').trim().slice(0, 100)
  if (ip) {
    const { count, error: countErr } = await (supabaseAdmin as any)
      .from('signup_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', since)
    if (!countErr && typeof count === 'number' && count >= SIGNUP_IP_LIMIT_PER_HOUR) {
      throw new Error('Too many signup attempts from your network. Please try again in an hour.')
    }
    try {
      await (supabaseAdmin as any).from('signup_attempts').insert({ ip, email, country: input.country || null })
    } catch { /* logging failure must not block signup */ }
  }

  const existingUser = await findUserByEmail(email)
  if (aliasTaken || existingUser?.email_confirmed_at || existingUser?.confirmed_at) {
    try {
      await sendCustomAuthEmail({ to: email, type: 'existing_account', siteUrl: input.siteUrl })
    } catch { /* same answer either way */ }
    return
  }

  const code = generateSixDigitCode()
  const codeHash = await hmacCode(email, 'signup', code)

  await (supabaseAdmin as any)
    .from('custom_auth_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('email', email)
    .eq('purpose', 'signup')
    .is('consumed_at', null)

  const { error } = await (supabaseAdmin as any).from('custom_auth_otps').insert({
    email,
    purpose: 'signup',
    code_hash: codeHash,
    full_name: input.fullName?.trim() || null,
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
  })
  if (error) throw new Error(error.message)

  await sendCustomAuthEmail({ to: email, type: 'signup', code, siteUrl: input.siteUrl })
}


export async function createRecoveryOtp(input: { email: string; siteUrl?: string }) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const email = normalizeEmail(input.email)
  const existingUser = await findUserByEmail(email)
  if (!existingUser) return

  const code = generateSixDigitCode()
  const codeHash = await hmacCode(email, 'recovery', code)

  await (supabaseAdmin as any)
    .from('custom_auth_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('email', email)
    .eq('purpose', 'recovery')
    .is('consumed_at', null)

  const { error } = await (supabaseAdmin as any).from('custom_auth_otps').insert({
    email,
    purpose: 'recovery',
    code_hash: codeHash,
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
  })
  if (error) throw new Error(error.message)

  // Auth-page "Forgot password" flow → email must contain ONLY the 6-digit code,
  // no reset link.
  await sendCustomAuthEmail({ to: email, type: 'recovery', code, siteUrl: input.siteUrl })
}



/** Step 2 of email sign-up: checks the emailed code without using it up, so the name/password step can follow. Wrong codes still count toward the attempt limit. */
export async function checkSignupOtp(input: { email: string; code: string }): Promise<{ ok: boolean; error?: string }> {
  assertPublicSignupOpen()
  const email = normalizeEmail(input.email)
  const verified = await verifyCustomOtp(email, 'signup', input.code)
  if (!verified.ok) return { ok: false, error: verified.error }
  const existingUser = await findUserByEmail(email)
  if (existingUser?.email_confirmed_at || existingUser?.confirmed_at) {
    return { ok: false, error: 'Account already exists. Please sign in.' }
  }
  return { ok: true }
}

export async function verifySignupOtp(input: { email: string; code: string; password: string; fullName?: string; emailUpdates?: boolean; ip?: string; country?: string; fingerprint: string; userAgent?: string }): Promise<CustomAuthResult> {
  assertPublicSignupOpen()
  const email = normalizeEmail(input.email)
  const verified = await verifyCustomOtp(email, 'signup', input.code)
  if (!verified.ok) return { ok: false, error: verified.error }

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const password = input.password
  const fullName = input.fullName?.trim() || verified.row.full_name?.trim() || undefined
  const meta: Record<string, unknown> = {}
  if (fullName) meta.full_name = fullName
  if (typeof input.emailUpdates === 'boolean') meta.email_updates = input.emailUpdates
  const existingUser = await findUserByEmail(email)

  if (existingUser?.email_confirmed_at || existingUser?.confirmed_at) {
    return { ok: false, error: 'Account already exists. Please sign in.' }
  }

  // Re-check device cap at the confirm step, in case someone tried to bypass the request step.
  try {
    await assertPasswordNotLeaked(password)
    assertSignupSignals(input)
    await assertNotVpn(input.ip)
    await assertNoEmailAlias(email)
    const { isDisposableEmail } = await import('./disposable-email-domains')
    if (isDisposableEmail(email)) throw new Error('Disposable email addresses are not allowed. Please use a permanent email.')
    const d = email.split('@')[1]?.toLowerCase().trim() || ''
    await assertRealMailDomain(d)
    await assertCompanyDomainCap(d)
    await assertDeviceUnderCap(input.ip, input.fingerprint)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Signup not allowed on this device.' }
  }

  const userResult = existingUser
    ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: Object.keys(meta).length ? meta : undefined,
      })
    : await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: Object.keys(meta).length ? meta : undefined,
      })

  if (userResult.error) return { ok: false, error: userResult.error.message }

  const auth = publicAuthClient()
  const { data, error } = await auth.auth.signInWithPassword({ email, password })
  if (error || !data.session) return { ok: false, error: error?.message || 'Account verified. Please sign in.' }

  // Log this confirmed account against the device / IP so the cap holds for future signups.
  const uid = data.session.user.id
  try {
    if (uid) {
      await (supabaseAdmin as any).from('account_devices').insert({
        user_id: uid,
        ip: (input.ip || '').slice(0, 100) || null,
        fingerprint: (input.fingerprint || '').split('_')[0].slice(0, 128) || null,
        hw_fingerprint: (input.fingerprint || '').split('_')[1]?.slice(0, 64) || null,
        user_agent: (input.userAgent || '').slice(0, 300) || null,
      })
    }
  } catch { /* logging failure must not block signup */ }

  // Free trial: one per device fingerprint / IP (and one per account in the database).
  try {
    if (uid) await claimProTrial(uid, (input.fingerprint || '').split('_')[0], input.ip)
  } catch { /* never block signup on trial bookkeeping */ }

  await consumeOtp(verified.row.id)
  return { ok: true, session: data.session }
}

/**
 * Starts the free trial for a new account and records it against this device/IP.
 * If the same device or IP already had a trial, no trial is given and the account
 * starts on Free instead.
 */
async function claimProTrial(userId: string, fingerprint?: string, ip?: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const admin = supabaseAdmin as any
  const rawFp = typeof fingerprint === 'string' ? fingerprint.slice(0, 128) : ''
  const fp = /^[A-Za-z0-9_-]{8,128}$/.test(rawFp) ? rawFp : null
  const ipHash = ip ? await sha256Hex(`jenvu-trial:${ip}`) : null

  let alreadyUsed = false
  if (fp || ipHash) {
    // Separate parameterized lookups — never interpolate caller input into filters.
    for (const [col, val] of [['fingerprint', fp], ['ip_hash', ipHash]] as const) {
      if (!val || alreadyUsed) continue
      const { data: prior } = await admin
        .from('trial_claims')
        .select('id')
        .eq(col, val)
        .neq('user_id', userId)
        .limit(1)
      alreadyUsed = Array.isArray(prior) && prior.length > 0
    }
  }

  // Same device or network already had a trial: the account starts on Free, no credit.
  if (alreadyUsed) {
    await admin.rpc('revoke_pro_trial', { _user_id: userId, _reason: 'duplicate_device' })
    return
  }

  await admin.from('trial_claims').insert({ user_id: userId, fingerprint: fp, ip_hash: ipHash })
  // Free trial (FREE_TRIAL_DAYS of Pro + FREE_TRIAL_CREDIT_USD credit), once per account, server-side only.
  const { error } = await admin.rpc('start_signup_trial', { _user_id: userId })
  if (error) console.error('[signup] free trial start failed:', error.message)
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}


export async function verifyRecoveryOtp(input: { email: string; code: string; siteUrl?: string }): Promise<CustomAuthResult> {
  const email = normalizeEmail(input.email)
  const verified = await verifyCustomOtp(email, 'recovery', input.code)
  if (!verified.ok) return { ok: false, error: verified.error }

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const link = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: input.siteUrl && /^https?:\/\//i.test(input.siteUrl) ? `${input.siteUrl}/auth` : undefined },
  })
  if (link.error || !link.data.properties?.email_otp) {
    return { ok: false, error: link.error?.message || 'Could not verify reset code. Tap Resend.' }
  }

  const auth = publicAuthClient()
  const { data, error } = await auth.auth.verifyOtp({
    email,
    token: link.data.properties.email_otp,
    type: 'recovery',
  })
  if (error || !data.session) return { ok: false, error: error?.message || 'Could not start password reset.' }

  await consumeOtp(verified.row.id)
  return { ok: true, session: data.session }
}

/** Reject passwords found in known breaches (same check the auth service runs at account creation), so the user hears it on the sign-up form instead of after entering the code. */
async function assertPasswordNotLeaked(password: string) {
  try {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password))
    const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hex.slice(0, 5)}`, { headers: { 'Add-Padding': 'true' } })
    if (!res.ok) return
    const body = await res.text()
    const suffix = hex.slice(5)
    const hit = body.split('\n').some((line) => {
      const [s, c] = line.trim().split(':')
      return s === suffix && Number(c) > 0
    })
    if (hit) throw new Error('This password is weak or has appeared in a data leak. Please choose a stronger password.')
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('This password')) throw e
  }
}

/**
 * Google / Apple sign-up: the account is created by the provider before any app
 * code runs, so the same abuse checks and the free trial run here right after.
 * A brand-new social account that fails the checks is removed again; an older
 * account (or one already processed) is left untouched.
 */
export async function finishSocialSignup(input: { userId: string; ip?: string; country?: string; fingerprint: string; userAgent?: string }): Promise<{ ok: boolean; isNew: boolean; error?: string }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { isFreshSocialSignup } = await import('./social-signup')
  const admin = supabaseAdmin as any
  const { data: got, error: getErr } = await supabaseAdmin.auth.admin.getUserById(input.userId)
  const user = got?.user
  if (getErr || !user) return { ok: false, isNew: false, error: 'Could not load your account. Please try again.' }

  const { data: seen } = await admin.from('account_devices').select('id').eq('user_id', user.id).limit(1)
  const alreadyProcessed = Array.isArray(seen) && seen.length > 0
  const provider = String((user.app_metadata as Record<string, unknown> | undefined)?.provider || 'email')
  if (!isFreshSocialSignup({ provider, createdAt: user.created_at, now: Date.now(), alreadyProcessed })) {
    return { ok: true, isNew: false }
  }

  const email = normalizeEmail(user.email || '')
  try {
    assertPublicSignupOpen()
    assertSignupSignals(input)
    await assertNotVpn(input.ip)
    if (email) {
      await assertNoEmailAlias(email)
      const { isDisposableEmail } = await import('./disposable-email-domains')
      if (isDisposableEmail(email)) throw new Error('Disposable email addresses are not allowed. Please use a permanent email.')
    }
    await assertDeviceUnderCap(input.ip, input.fingerprint)
  } catch (e) {
    // Remove the just-created account so the same person can't keep it.
    await supabaseAdmin.auth.admin.deleteUser(user.id).catch(() => undefined)
    return { ok: false, isNew: true, error: e instanceof Error ? e.message : 'Sign-up is not allowed on this device.' }
  }

  try {
    await admin.from('account_devices').insert({
      user_id: user.id,
      ip: (input.ip || '').slice(0, 100) || null,
      fingerprint: (input.fingerprint || '').split('_')[0].slice(0, 128) || null,
      hw_fingerprint: (input.fingerprint || '').split('_')[1]?.slice(0, 64) || null,
      user_agent: (input.userAgent || '').slice(0, 300) || null,
    })
  } catch { /* logging failure must not block signup */ }
  try {
    await claimProTrial(user.id, (input.fingerprint || '').split('_')[0], input.ip)
  } catch { /* never block signup on trial bookkeeping */ }
  return { ok: true, isNew: true }
}


// ---------------------------------------------------------------------------
// One-time email codes for sign-in and the email second step (rules: two-factor.ts)
// ---------------------------------------------------------------------------

type CodePurpose = 'login' | 'second_step' | 'email_2fa_setup'
/** No new code for the same email+purpose more often than this. */
const CODE_RESEND_GAP_MS = 45_000

/** Creates and emails a 6-digit code for `purpose`, replacing any open one. Returns false when one was sent moments ago. */
export async function sendPurposeCode(rawEmail: string, purpose: CodePurpose): Promise<boolean> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const admin = supabaseAdmin as any
  const email = normalizeEmail(rawEmail)
  const { data: recent } = await admin
    .from('custom_auth_otps')
    .select('id')
    .eq('email', email)
    .eq('purpose', purpose)
    .gte('created_at', new Date(Date.now() - CODE_RESEND_GAP_MS).toISOString())
    .limit(1)
  if ((recent ?? []).length) return false
  await admin
    .from('custom_auth_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('email', email)
    .eq('purpose', purpose)
    .is('consumed_at', null)
  const code = generateSixDigitCode()
  const { error } = await admin.from('custom_auth_otps').insert({
    email,
    purpose,
    code_hash: await hmacCode(email, purpose, code),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
  })
  if (error) throw new Error(error.message)
  await sendCustomAuthEmail({ to: email, type: purpose, code })
  return true
}

/** Checks and uses up a code (5 wrong tries max). */
export async function usePurposeCode(rawEmail: string, purpose: CodePurpose, code: string): Promise<{ ok: boolean; error?: string }> {
  const email = normalizeEmail(rawEmail)
  const verified = await verifyCustomOtp(email, purpose, code)
  if (!verified.ok) return { ok: false, error: verified.error }
  await consumeOtp(verified.row.id)
  return { ok: true }
}

export async function emailCodeOn(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data } = await (supabaseAdmin as any).from('account_email_2fa').select('user_id').eq('user_id', userId).maybeSingle()
  return !!data
}

/** Marks the session in this token as having passed the email second step. */
export async function markSessionEmailVerified(accessToken: string, userId: string) {
  const { readTokenClaims } = await import('./two-factor')
  const sessionId = String(readTokenClaims(accessToken)?.session_id || '')
  if (!sessionId) return
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  await (supabaseAdmin as any).from('email_2fa_sessions').upsert({ session_id: sessionId, user_id: userId })
}

/**
 * Password sign-in on the server. When the account has email codes on, the new
 * session is ended right away and a code is emailed instead; the sign-in only
 * finishes in `finishPasswordSignInWithCode`.
 */
export async function passwordSignInWithSecondStep(email: string, password: string) {
  const client = publicAuthClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) return { ok: false as const, error: error?.message || 'Sign-in failed.' }
  if (await emailCodeOn(data.user.id)) {
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
    await sendPurposeCode(email, 'second_step')
    return { ok: false as const, needsEmailCode: true as const, error: 'Enter the code we emailed you.' }
  }
  return {
    ok: true as const,
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
  }
}

export async function finishPasswordSignInWithCode(email: string, password: string, code: string) {
  const checked = await usePurposeCode(email, 'second_step', code)
  if (!checked.ok) return { ok: false as const, error: checked.error || 'Invalid code. Try again.' }
  const { data, error } = await publicAuthClient().auth.signInWithPassword({ email, password })
  if (error || !data.session) return { ok: false as const, error: error?.message || 'Sign-in failed.' }
  await markSessionEmailVerified(data.session.access_token, data.user.id)
  return {
    ok: true as const,
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
  }
}

/** One-time email code sign-in (no password). */
export async function codeSignIn(rawEmail: string, code: string) {
  const email = normalizeEmail(rawEmail)
  const checked = await usePurposeCode(email, 'login', code)
  if (!checked.ok) return { ok: false as const, error: checked.error || 'Invalid code. Try again.' }
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const link = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })
  const otp = link.data?.properties?.email_otp
  if (link.error || !otp) return { ok: false as const, error: 'Could not sign you in. Request a new code.' }
  const { data, error } = await publicAuthClient().auth.verifyOtp({ email, token: otp, type: 'email' })
  if (error || !data.session || !data.user) return { ok: false as const, error: error?.message || 'Could not sign you in. Request a new code.' }
  return {
    ok: true as const,
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
  }
}
