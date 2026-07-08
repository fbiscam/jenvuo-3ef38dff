import { createClient } from '@supabase/supabase-js'
import type { Session, User } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { sendCustomAuthEmail } from './custom-auth-email.server'

type OtpPurpose = 'signup' | 'recovery'

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

async function findUserByEmail(email: string): Promise<User | null> {
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

export async function createSignupOtp(input: { email: string; password: string; fullName: string; siteUrl?: string }) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const email = normalizeEmail(input.email)

  const existingUser = await findUserByEmail(email)
  if (existingUser?.email_confirmed_at || existingUser?.confirmed_at) {
    throw new Error('An account with this email already exists. Please sign in instead.')
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
    full_name: input.fullName.trim(),
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



export async function verifySignupOtp(input: { email: string; code: string; password: string }): Promise<CustomAuthResult> {
  const email = normalizeEmail(input.email)
  const verified = await verifyCustomOtp(email, 'signup', input.code)
  if (!verified.ok) return { ok: false, error: verified.error }

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const password = input.password
  const fullName = verified.row.full_name?.trim() || undefined
  const existingUser = await findUserByEmail(email)

  if (existingUser?.email_confirmed_at || existingUser?.confirmed_at) {
    return { ok: false, error: 'Account already exists. Please sign in.' }
  }

  const userResult = existingUser
    ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      })
    : await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      })

  if (userResult.error) return { ok: false, error: userResult.error.message }

  const auth = publicAuthClient()
  const { data, error } = await auth.auth.signInWithPassword({ email, password })
  if (error || !data.session) return { ok: false, error: error?.message || 'Account verified. Please sign in.' }

  await consumeOtp(verified.row.id)
  return { ok: true, session: data.session }
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