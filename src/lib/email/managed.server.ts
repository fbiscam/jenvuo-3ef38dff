// Server-only: sends email through Lovable's managed email API.
// Delivery, retries, rate limits, suppression, and unsubscribe are handled by
// Lovable — this project has no email queue.
import { EmailAPIError, sendLovableEmail } from '@lovable.dev/email-js'

export const SITE_NAME = 'Jenvu'
// Verified delegated sender subdomain (API lookup).
export const SENDER_DOMAIN = 'notify.jenvu.com'
// Visible From: domain.
export const FROM_DOMAIN = 'jenvu.com'

export type ManagedSendResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface ManagedSendArgs {
  to: string
  subject: string
  html: string
  text?: string
  label: string
  idempotencyKey?: string
  /** Defaults to `Jenvu <noreply@jenvu.com>`. */
  from?: string
  replyTo?: string
}

/**
 * Sends a pre-rendered email. A suppressed recipient resolves
 * `{ sent: false, reason: 'recipient_suppressed' }` (expected, never retry);
 * every other failure throws (EmailAPIError exposes .code / .status).
 */
export async function sendManagedEmail(args: ManagedSendArgs): Promise<ManagedSendResult> {
  const apiKey = process.env['LOVABLE_API_KEY']
  if (!apiKey) throw new Error('LOVABLE_API_KEY is not configured')

  try {
    await sendLovableEmail(
      {
        to: args.to,
        from: args.from ?? `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: args.subject,
        html: args.html,
        text: args.text ?? args.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        purpose: 'transactional',
        label: args.label,
        idempotency_key: args.idempotencyKey || crypto.randomUUID(),
        reply_to: args.replyTo,
      },
      { apiKey, sendUrl: process.env['LOVABLE_SEND_URL'] },
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      return { sent: false, reason: 'recipient_suppressed' }
    }
    throw error
  }

  return { sent: true }
}

/**
 * Appends a row to the app's own email_send_log history table.
 * Never decides whether a send happened — logging failures are logged only.
 */
export async function logEmailSend(
  admin: { from: (t: string) => any },
  row: {
    templateName: string
    recipientEmail: string
    status: 'sent' | 'suppressed' | 'failed'
    messageId?: string | null
    errorMessage?: string | null
  },
): Promise<void> {
  try {
    const { error } = await admin.from('email_send_log').insert({
      message_id: row.messageId ?? null,
      template_name: row.templateName,
      recipient_email: row.recipientEmail,
      status: row.status,
      error_message: row.errorMessage ? row.errorMessage.slice(0, 1000) : null,
    })
    if (error) {
      console.error('[email] email_send_log insert failed', {
        code: error.code,
        message: error.message,
      })
    }
  } catch (e) {
    console.error('[email] email_send_log insert threw', (e as Error)?.message)
  }
}

/**
 * Sends and records the outcome in email_send_log in one step.
 * Returns true when the message was accepted for delivery.
 */
export async function sendManagedEmailLogged(
  admin: { from: (t: string) => any },
  args: ManagedSendArgs & { templateName?: string },
): Promise<boolean> {
  const templateName = args.templateName ?? args.label
  try {
    const result = await sendManagedEmail(args)
    await logEmailSend(admin, {
      templateName,
      recipientEmail: args.to,
      status: result.sent ? 'sent' : 'suppressed',
      errorMessage: result.sent ? null : 'Recipient suppressed by Lovable email delivery',
    })
    return result.sent
  } catch (error) {
    await logEmailSend(admin, {
      templateName,
      recipientEmail: args.to,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Failed to send email',
    })
    return false
  }
}
