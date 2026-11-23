import * as React from 'react'
import { sendLovableEmail } from '@lovable.dev/email-js'
import { render } from '@react-email/render'
import { SignupEmail } from '@/lib/email-templates/signup'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { SignInCodeEmail, signInCodeSubject } from '@/lib/email-templates/sign-in-code'
import { ExistingAccountEmail, EXISTING_ACCOUNT_SUBJECT } from '@/lib/email-templates/existing-account'

type CustomAuthEmailInput = {
  to: string
  type: 'signup' | 'recovery' | 'login' | 'second_step' | 'email_2fa_setup' | 'existing_account'
  code?: string
  siteUrl?: string
  resetLink?: string
}


const SITE_NAME = 'Jenvu'
const ROOT_DOMAIN = 'jenvu.com'
const FROM_DOMAIN = 'notify.jenvu.com'
const SENDER_DOMAIN = 'notify.jenvu.com'

function generateUnsubToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}


export async function sendCustomAuthEmail({ to, type, code, resetLink }: CustomAuthEmailInput) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const apiKey = process.env.LOVABLE_API_KEY
  if (!apiKey) throw new Error('Server is missing email configuration.')

  const origin = `https://${ROOT_DOMAIN}`
  const messageId = crypto.randomUUID()
  const idempotencyKey = `custom-auth-${type}-${messageId}`

  const element =
    type === 'signup' ? (
      <SignupEmail
        siteName={SITE_NAME}
        siteUrl={origin}
        recipient={to}
        confirmationUrl={`${origin}/auth`}
        token={code ?? ''}
        showLink={false}
      />
    ) : type === 'existing_account' ? (
      <ExistingAccountEmail />
    ) : type !== 'recovery' ? (
      <SignInCodeEmail kind={type} token={code ?? ''} recipient={to} />
    ) : (
      <RecoveryEmail
        siteName={SITE_NAME}
        confirmationUrl={resetLink || `${origin}/reset-password`}
        recipient={to}
        token={code ?? ''}
        showLink={Boolean(resetLink)}
      />
    )


  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = type === 'signup' ? 'Confirm your email' : type === 'recovery' ? 'Reset your password' : type === 'existing_account' ? EXISTING_ACCOUNT_SUBJECT : signInCodeSubject(type)

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: type,
    recipient_email: to,
    status: 'pending',
  })


  try {
    await sendLovableEmail(
      {
        message_id: messageId,
        to,
        from: `Jenvu <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        // NOTE: Lovable's send API requires purpose=transactional when we
        // don't have a build run_id. Auth emails from runtime code must go
        // through this path (and therefore include an unsubscribe_token).
        purpose: 'transactional',
        label: type,
        idempotency_key: idempotencyKey,
      },


      { apiKey, sendUrl: process.env.LOVABLE_SEND_URL },
    )

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: type,
      recipient_email: to,
      status: 'sent',
    })
  } catch (error) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: type,
      recipient_email: to,
      status: 'failed',
      error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Failed to send email',
    })
    throw new Error('Could not send verification email. Please try again.')
  }
}