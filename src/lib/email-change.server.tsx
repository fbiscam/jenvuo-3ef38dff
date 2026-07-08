import * as React from 'react'
import { render } from '@react-email/render'
import { sendLovableEmail } from '@lovable.dev/email-js'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'

const SITE_NAME = 'Jenvu'
const ROOT_DOMAIN = 'jenvu.com'
const FROM_DOMAIN = 'jenvu.net'
const SENDER_DOMAIN = 'notify.jenvu.net'
const TOKEN_TTL_MINUTES = 60

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createEmailChangeRequest(input: {
  userId: string
  oldEmail: string
  newEmail: string
  siteUrl?: string
}) {
  const oldEmail = normalizeEmail(input.oldEmail)
  const newEmail = normalizeEmail(input.newEmail)
  if (oldEmail === newEmail) throw new Error('New email must be different from your current email.')

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  // Check that new email isn't already in use
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    if (data.users.find((u) => u.email?.toLowerCase() === newEmail)) {
      throw new Error('That email is already in use by another account.')
    }
    if (!data.nextPage) break
  }

  // Invalidate previous pending requests
  await (supabaseAdmin as any)
    .from('email_change_requests')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', input.userId)
    .is('consumed_at', null)

  const token = generateToken()
  const tokenHash = await sha256Hex(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString()

  const { error } = await (supabaseAdmin as any).from('email_change_requests').insert({
    user_id: input.userId,
    old_email: oldEmail,
    new_email: newEmail,
    token_hash: tokenHash,
    expires_at: expiresAt,
  })
  if (error) throw new Error(error.message)

  const origin = input.siteUrl && /^https?:\/\//i.test(input.siteUrl) ? input.siteUrl : `https://${ROOT_DOMAIN}`
  const confirmationUrl = `${origin}/confirm-email-change?token=${token}`

  await sendEmailChangeEmail({ to: oldEmail, oldEmail, newEmail, confirmationUrl })
}

async function sendEmailChangeEmail(args: {
  to: string
  oldEmail: string
  newEmail: string
  confirmationUrl: string
}) {
  const apiKey = process.env.LOVABLE_API_KEY
  if (!apiKey) throw new Error('Server is missing email configuration.')

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const messageId = crypto.randomUUID()

  const element = (
    <EmailChangeEmail
      siteName={SITE_NAME}
      oldEmail={args.oldEmail}
      email={args.oldEmail}
      newEmail={args.newEmail}
      confirmationUrl={args.confirmationUrl}
    />
  )
  const html = await render(element)
  const text = await render(element, { plainText: true })

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'email_change',
    recipient_email: args.to,
    status: 'pending',
  })

  try {
    await sendLovableEmail(
      {
        message_id: messageId,
        to: args.to,
        from: `Jenvu <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: 'Confirm your email change',
        html,
        text,
        purpose: 'transactional',
        label: 'email_change',
        idempotency_key: `email-change-${messageId}`,
      },
      { apiKey, sendUrl: process.env.LOVABLE_SEND_URL },
    )
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'email_change',
      recipient_email: args.to,
      status: 'sent',
    })
  } catch (error) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'email_change',
      recipient_email: args.to,
      status: 'failed',
      error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Failed to send email',
    })
    throw new Error('Could not send confirmation email. Please try again.')
  }
}

export async function confirmEmailChangeToken(token: string) {
  if (!token || token.length < 16) return { ok: false as const, error: 'Invalid confirmation link.' }
  const tokenHash = await sha256Hex(token)

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data: row, error } = await (supabaseAdmin as any)
    .from('email_change_requests')
    .select('id,user_id,old_email,new_email,expires_at,consumed_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error) return { ok: false as const, error: error.message }
  if (!row) return { ok: false as const, error: 'This confirmation link is invalid or has already been used.' }
  if (row.consumed_at) return { ok: false as const, error: 'This confirmation link has already been used.' }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false as const, error: 'This confirmation link has expired. Please request a new one.' }
  }

  const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
    email: row.new_email,
    email_confirm: true,
  })
  if (updErr) return { ok: false as const, error: updErr.message }

  await (supabaseAdmin as any)
    .from('email_change_requests')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id)

  return { ok: true as const, newEmail: row.new_email as string }
}
