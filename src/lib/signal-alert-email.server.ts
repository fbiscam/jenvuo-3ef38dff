// Server-only helper: enqueue signal-alert emails to opted-in paid subscribers.
// Used by manual admin broadcast and auto-scan cron.
import { supabaseAdmin } from '@/integrations/supabase/client.server'

const SENDER_DOMAIN = 'notify.jenvu.net'
const FROM = 'Jenvu Signal Desk <signals@notify.jenvu.net>'

export interface EnqueueAlertEmailsArgs {
  alertId: string
  firedAt: string
  pair: string
  grade: 'A+' | 'A' | 'B' | 'C'
  direction: 'BUY' | 'SELL'
  entry: number
  sl: number
  tp: number
  rr: number
  confidence: number
  decimals: number
  session?: string | null
  killzone?: string | null
  htfBias?: string | null
  rationale?: string | null
}

export async function enqueueSignalAlertEmails(a: EnqueueAlertEmailsArgs): Promise<{ enqueued: number }> {
  // 1. Resolve opt-in subscribers
  const { data: subs } = await supabaseAdmin
    .from('signal_alert_subscribers')
    .select('email')
    .eq('status', 'active')
  const allSubEmails = Array.from(
    new Set(
      (subs ?? [])
        .map((s: { email: string | null }) => (s.email ?? '').toLowerCase().trim())
        .filter((e) => !!e && /.+@.+\..+/.test(e)),
    ),
  )
  if (allSubEmails.length === 0) return { enqueued: 0 }

  // 2. Intersect with paid users
  const { data: matchedUsers } = (await supabaseAdmin
    .schema('auth' as never)
    .from('users' as never)
    .select('id, email')
    .in('email', allSubEmails)) as unknown as {
    data: Array<{ id: string; email: string }> | null
  }
  const emailByUserId = new Map<string, string>()
  for (const u of matchedUsers ?? []) {
    if (u?.id && u?.email) emailByUserId.set(u.id, u.email.toLowerCase().trim())
  }
  if (emailByUserId.size === 0) return { enqueued: 0 }

  const { data: paidRows } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id')
    .eq('status', 'active')
    .neq('plan_id', 'free')
    .in('user_id', Array.from(emailByUserId.keys()))
  const paidEmailSet = new Set(
    (paidRows ?? [])
      .map((r: { user_id: string }) => emailByUserId.get(r.user_id))
      .filter((e): e is string => !!e),
  )
  const recipients = allSubEmails.filter((e) => paidEmailSet.has(e))
  if (recipients.length === 0) return { enqueued: 0 }

  // 3. Render template
  const { default: React } = await import('react')
  const { render } = await import('@react-email/render')
  const { template } = await import('@/lib/email-templates/signal-alert')

  const round = (n: number) => Number(n.toFixed(a.decimals))
  const templateData = {
    pair: a.pair,
    grade: a.grade,
    direction: a.direction,
    entry: round(a.entry).toFixed(a.decimals),
    sl: round(a.sl).toFixed(a.decimals),
    tp: round(a.tp).toFixed(a.decimals),
    rr: a.rr.toFixed(2),
    confidence: Math.round(a.confidence),
    session: a.session ?? '',
    killzone: a.killzone ?? '',
    htfBias: a.htfBias ?? '',
    rationale: a.rationale ?? '',
    firedAt: a.firedAt,
    signalUrl: 'https://jenvu.com/signal',
  }
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  // 4. Enqueue one-by-one with suppression + unsubscribe tokens
  let enqueued = 0
  for (const email of recipients) {
    const normalized = email.toLowerCase()
    const { data: suppressed } = await supabaseAdmin
      .from('suppressed_emails')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()
    if (suppressed) continue

    let token: string | null = null
    const { data: existing } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', normalized)
      .maybeSingle()
    if (existing && !existing.used_at) {
      token = existing.token
    } else if (!existing) {
      const bytes = new Uint8Array(32)
      crypto.getRandomValues(bytes)
      token = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .upsert({ token, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
      const { data: stored } = await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', normalized)
        .maybeSingle()
      token = stored?.token ?? token
    } else {
      continue
    }

    const messageId = crypto.randomUUID()
    const idempotencyKey = `alert-${a.alertId}-${normalized}`

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'signal-alert',
      recipient_email: normalized,
      status: 'pending',
    })

    const { error: enqErr } = await supabaseAdmin.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: normalized,
        from: FROM,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: 'signal-alert',
        idempotency_key: idempotencyKey,
        unsubscribe_token: token,
        queued_at: new Date().toISOString(),
      },
    })
    if (!enqErr) enqueued++
  }

  return { enqueued }
}
