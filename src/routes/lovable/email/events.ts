import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

async function record(
  recipient: string,
  reason: Reason,
  logStatus: 'bounced' | 'complained' | 'suppressed',
  note: string,
  metadata: unknown,
  eventId: string,
) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const email = recipient.toLowerCase().trim()

  const { error: supErr } = await supabaseAdmin
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: (metadata ?? null) as never }, { onConflict: 'email' })
  if (supErr) {
    console.error('[email-events] suppression upsert failed', {
      event_id: eventId,
      code: supErr.code,
      message: supErr.message,
    })
    throw new Error('suppression upsert failed')
  }

  const { error: logErr } = await supabaseAdmin.from('email_send_log').insert({
    template_name: 'system',
    recipient_email: email,
    status: logStatus,
    error_message: note,
  })
  if (logErr) {
    console.error('[email-events] send log insert failed', {
      event_id: eventId,
      code: logErr.code,
      message: logErr.message,
    })
    throw new Error('send log insert failed')
  }
}

export const Route = createFileRoute('/lovable/email/events')({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              await record(
                event.data.recipient,
                'bounce',
                'bounced',
                'Recipient address bounced',
                null,
                event.event_id,
              )
            },
            'email.complaint': async (event) => {
              await record(
                event.data.recipient,
                'complaint',
                'complained',
                'Recipient marked the message as spam',
                null,
                event.event_id,
              )
            },
            'email.unsubscribed': async (event) => {
              await record(
                event.data.recipient,
                'unsubscribe',
                'suppressed',
                'Recipient unsubscribed',
                null,
                event.event_id,
              )
            },
          },
        })
        return handler(request)
      },
    },
  },
})
