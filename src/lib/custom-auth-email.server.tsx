import * as React from 'react'
import { render } from '@react-email/render'
import { SignupEmail } from '@/lib/email-templates/signup'
import { RecoveryEmail } from '@/lib/email-templates/recovery'

type CustomAuthEmailInput = {
  to: string
  type: 'signup' | 'recovery'
  code: string
  siteUrl?: string
}

const SITE_NAME = 'Jenvu'
const ROOT_DOMAIN = 'jenvu.com'
const FROM_DOMAIN = 'jenvu.net'
const SENDER_DOMAIN = 'notify.jenvu.net'

export async function sendCustomAuthEmail({ to, type, code, siteUrl }: CustomAuthEmailInput) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const origin = siteUrl && /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${ROOT_DOMAIN}`
  const messageId = crypto.randomUUID()
  const runId = `custom-auth-${type}-${messageId}`

  const element =
    type === 'signup' ? (
      <SignupEmail
        siteName={SITE_NAME}
        siteUrl={origin}
        recipient={to}
        confirmationUrl={`${origin}/auth`}
        token={code}
        showLink={false}
      />
    ) : (
      <RecoveryEmail
        siteName={SITE_NAME}
        confirmationUrl={`${origin}/auth`}
        recipient={to}
        token={code}
        showLink={false}
      />
    )

  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = type === 'signup' ? 'Confirm your email' : 'Reset your password'

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: type,
    recipient_email: to,
    status: 'pending',
  })

  const { error } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      run_id: runId,
      message_id: messageId,
      to,
      from: `Jenvu <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: type,
      queued_at: new Date().toISOString(),
    },
  })

  if (error) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: type,
      recipient_email: to,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    throw new Error('Could not send verification email. Please try again.')
  }
}