import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'

function readClientIp(): string {
  try {
    const req = getRequest()
    const h = req.headers
    const raw =
      h.get('cf-connecting-ip') ||
      h.get('x-forwarded-for')?.split(',')[0] ||
      h.get('x-real-ip') ||
      ''
    return raw.trim()
  } catch {
    return ''
  }
}

function readTrustedCountry(): string {
  try {
    const headers = getRequest().headers
    const cloudflareCountry = headers.get('cf-ipcountry')?.trim().toUpperCase() || ''
    if (/^[A-Z]{2}$/.test(cloudflareCountry)) return cloudflareCountry
    if (process.env['VERCEL'] === '1') {
      const vercelCountry = headers.get('x-vercel-ip-country')?.trim().toUpperCase() || ''
      if (/^[A-Z]{2}$/.test(vercelCountry)) return vercelCountry
    }
  } catch {
    return ''
  }
  return ''
}

import {
  createRecoveryOtp,
  createSignupOtp,
  verifyRecoveryOtp,
  verifySignupOtp,
} from './custom-auth.server'

const siteUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((url) => /^https?:\/\//i.test(url), 'Invalid site URL')
  .optional()

const turnstileTokenSchema = z.string().trim().max(2048).optional().nullable()

async function passTurnstile(token: string | null | undefined) {
  const { checkTurnstile } = await import('./turnstile')
  return checkTurnstile({ secret: process.env.TURNSTILE_SECRET_KEY, token, ip: readClientIp() })
}

/** Public Cloudflare site key for the sign-in/sign-up check (null = check off). */
export const getTurnstileSiteKey = createServerFn({ method: 'GET' }).handler(async () => {
  const key = process.env.TURNSTILE_SITE_KEY?.trim()
  return { siteKey: key && process.env.TURNSTILE_SECRET_KEY?.trim() ? key : null }
})

/** Email + password sign-in, only after the Cloudflare check passes. */
export const signInWithTurnstile = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email('Enter a valid email').max(255),
        password: z.string().min(1).max(72),
        turnstileToken: turnstileTokenSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const check = await passTurnstile(data.turnstileToken)
    if (!check.ok) return { ok: false as const, error: check.error, captcha: true }
    const { passwordSignIn } = await import('./custom-auth.server')
    const res = await passwordSignIn(data.email, data.password)
    return res.ok ? res : { ...res, captcha: false }
  })

export const requestSignupOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(1, 'Name is required').max(100),
        email: z.string().trim().email('Enter a valid email').max(255),
        password: z.string().min(8, 'Password must be at least 8 characters').max(72),
        siteUrl: siteUrlSchema,
        fingerprint: z.string().trim().min(32, 'Device verification failed. Refresh the page and try again.').max(128),
        turnstileToken: turnstileTokenSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const check = await passTurnstile(data.turnstileToken)
      if (!check.ok) return { ok: false as const, error: check.error }
      const { turnstileToken: _t, ...input } = data
      const ua = (() => { try { return getRequest().headers.get('user-agent') || '' } catch { return '' } })()
      await createSignupOtp({ ...input, ip: readClientIp(), country: readTrustedCountry(), fingerprint: input.fingerprint, userAgent: ua })
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'Could not send code.' }
    }
  })

export const confirmSignupOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email('Enter a valid email').max(255),
        code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
        password: z.string().min(8, 'Password must be at least 8 characters').max(72),
        fingerprint: z.string().trim().min(32, 'Device verification failed. Refresh the page and try again.').max(128),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const ua = (() => { try { return getRequest().headers.get('user-agent') || '' } catch { return '' } })()
    return verifySignupOtp({ ...data, ip: readClientIp(), country: readTrustedCountry(), fingerprint: data.fingerprint, userAgent: ua })
  })

export const requestRecoveryOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email('Enter a valid email').max(255),
        siteUrl: siteUrlSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      await createRecoveryOtp(data)
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'Could not send code.' }
    }
  })

export const confirmRecoveryOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email('Enter a valid email').max(255),
        code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
        siteUrl: siteUrlSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => verifyRecoveryOtp(data))
/**
 * After a failed password sign-in, tells the page whether the email has an
 * account (so it can say "wrong password") or not (so it can say "sign up").
 */
export const signInFailureHint = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const { findUserByEmail } = await import('./custom-auth.server')
    const user = await findUserByEmail(data.email.toLowerCase())
    const exists = !!user
    return { hint: exists ? ('wrong_password' as const) : ('no_account' as const) }
  })
