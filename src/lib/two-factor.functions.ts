import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { needsEmailSecondStep, securityHoldMessage, sessionMethods } from './two-factor'


async function setEmailFlag(userId: string, on: boolean) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  // Read by the dashboard guard from the session token (only to decide whether to ask the server).
  await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: { email_2fa: on } })
}

/** Security page: which two-step methods are on and whether removal is on hold. */
export const getTwoStepStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { emailCodeOn } = await import('./custom-auth.server')
    const { readSecurityHold } = await import('./two-factor.server')
    const [emailOn, hold] = await Promise.all([emailCodeOn(context.userId), readSecurityHold(context.userId)])
    return { emailCode: emailOn, holdUntil: hold ? new Date(hold).toISOString() : null }
  })

/** Step 1 of turning on email codes: emails a setup code to the account email. */
export const startEmailTwoStep = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String((context.claims as any)?.email || '')
    if (!email) return { ok: false as const, error: 'Your account has no email address.' }
    try {
      const { sendPurposeCode } = await import('./custom-auth.server')
      const sent = await sendPurposeCode(email, 'email_2fa_setup')
      return { ok: true as const, email, resent: sent }
    } catch {
      return { ok: false as const, error: 'Could not send the code. Try again.' }
    }
  })

/** Step 2: the code from the email turns email codes on (and counts for this session). */
export const confirmEmailTwoStep = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }).parse(d))
  .handler(async ({ data, context }) => {
    const email = String((context.claims as any)?.email || '')
    const { usePurposeCode } = await import('./custom-auth.server')
    const checked = await usePurposeCode(email, 'email_2fa_setup', data.code)
    if (!checked.ok) return { ok: false as const, error: checked.error || 'Invalid code. Try again.' }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as any
    await admin.from('account_email_2fa').upsert({ user_id: context.userId, enabled_at: new Date().toISOString() })
    const sessionId = String((context.claims as any)?.session_id || '')
    if (sessionId) await admin.from('email_2fa_sessions').upsert({ session_id: sessionId, user_id: context.userId })
    await setEmailFlag(context.userId, true)
    return { ok: true as const }
  })

/** Turns email codes off — refused for 24h after a sign-in from a new device. */
export const disableEmailTwoStep = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { readSecurityHold } = await import('./two-factor.server')
    const hold = await readSecurityHold(context.userId)
    if (hold) return { ok: false as const, error: securityHoldMessage(hold) }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as any
    await admin.from('account_email_2fa').delete().eq('user_id', context.userId)
    await admin.from('email_2fa_sessions').delete().eq('user_id', context.userId)
    await setEmailFlag(context.userId, false)
    return { ok: true as const }
  })

/** Removes the authenticator app — needs a session that passed the app code, and no security hold. */
export const disableAuthenticator = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ factorId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if ((context.claims as any)?.aal !== 'aal2') {
      return { ok: false as const, error: 'Sign in again with your authenticator code, then try again.' }
    }
    const { readSecurityHold } = await import('./two-factor.server')
    const hold = await readSecurityHold(context.userId)
    if (hold) return { ok: false as const, error: securityHoldMessage(hold) }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await supabaseAdmin.auth.admin.mfa.deleteFactor({ id: data.factorId, userId: context.userId })
    if (error) return { ok: false as const, error: 'Could not remove the authenticator. Try again.' }
    return { ok: true as const }
  })

/** Dashboard guard: does this session still owe the email code? */
export const checkEmailSecondStep = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { emailCodeOn } = await import('./custom-auth.server')
    const on = await emailCodeOn(context.userId)
    if (!on) return { required: false }
    const sessionId = String((context.claims as any)?.session_id || '')
    let verified = false
    if (sessionId) {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { data } = await (supabaseAdmin as any).from('email_2fa_sessions').select('session_id').eq('session_id', sessionId).maybeSingle()
      verified = !!data
    }
    return { required: needsEmailSecondStep({ emailCodeOn: on, methods: sessionMethods(context.claims as any), sessionVerified: verified }) }
  })
