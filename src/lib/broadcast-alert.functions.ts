import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

const SENDER_DOMAIN = 'notify.jenvu.com'
const FROM = 'Jenvu Signal Desk <signals@jenvu.com>'

const BroadcastSchema = z.object({
  pair: z.string().min(3).max(16),
  grade: z.enum(['A+', 'A', 'B', 'C']),
  direction: z.enum(['BUY', 'SELL']),
  entry: z.number(),
  sl: z.number(),
  tp: z.number(),
  rr: z.number(),
  confidence: z.number().min(0).max(100),
  session: z.string().max(64).nullable().optional(),
  killzone: z.string().max(64).nullable().optional(),
  htfBias: z.string().max(64).nullable().optional(),
  rationale: z.string().max(1000).optional(),
  decimals: z.number().int().min(0).max(6).default(2),
  setupScore: z.number().min(0).max(100).optional(),
})

export const broadcastCurrentSignal = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BroadcastSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Admin gate
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (!isAdmin) throw new Error('Forbidden: admin access required')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const round = (n: number) => Number(n.toFixed(data.decimals))
    const pair = data.pair.toUpperCase().replace(/[^A-Z]/g, '')

    // 1. Insert into signal_alerts
    const grade = ['A+', 'A'].includes(data.grade) ? data.grade : 'A'
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('signal_alerts')
      .insert({
        pair,
        grade,
        direction: data.direction,
        entry: round(data.entry),
        sl: round(data.sl),
        tp: round(data.tp),
        rr: Number(data.rr.toFixed(2)),
        confidence: Math.round(data.confidence),
        setup_score: Math.round(data.setupScore ?? data.confidence),
        htf_bias: data.htfBias ?? null,
        session: data.session ?? null,
        killzone: data.killzone ?? null,
        rationale: (data.rationale ?? '').slice(0, 1000),
      })
      .select()
      .single()

    if (insertErr || !inserted) {
      throw new Error(insertErr?.message ?? 'Failed to record alert')
    }

    // 2. Resolve paid subscriber recipients (email + user_id)
    const { data: subs } = await supabaseAdmin
      .from('signal_alert_subscribers')
      .select('email')
      .eq('status', 'active')
    const subEmails = (subs ?? [])
      .map((s: { email: string | null }) => (s.email ?? '').toLowerCase())
      .filter(Boolean)

    let recipients: Array<{ email: string; user_id: string }> = []
    if (subEmails.length > 0) {
      const { data: authUsers } = await supabaseAdmin
        .schema('auth')
        .from('users')
        .select('id, email')
        .in('email', subEmails)
      const emailById = new Map<string, string>(
        (authUsers ?? []).map((u: { id: string; email: string }) => [u.id, u.email.toLowerCase()]),
      )
      const userIds = Array.from(emailById.keys())
      if (userIds.length > 0) {
        const { data: paidSubs } = await supabaseAdmin
          .from('user_subscriptions')
          .select('user_id, plan_id, status')
          .in('user_id', userIds)
          .eq('status', 'active')
          .neq('plan_id', 'free')
        recipients = (paidSubs ?? [])
          .map((r: { user_id: string }) => {
            const email = emailById.get(r.user_id)
            return email ? { email, user_id: r.user_id } : null
          })
          .filter((x): x is { email: string; user_id: string } => x !== null)
      }
    }

    // 3. Insert in-app notifications for all paid users (even non-subscribers)
    const { data: allPaid } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id')
      .eq('status', 'active')
      .neq('plan_id', 'free')
    const notifyUserIds = Array.from(new Set((allPaid ?? []).map((r: { user_id: string }) => r.user_id)))

    if (notifyUserIds.length > 0) {
      const rationale = (data.rationale ?? '').slice(0, 500)
      const title = `${grade} ${data.direction} · ${pair}`
      const body = `Entry ${round(data.entry)} · SL ${round(data.sl)} · TP ${round(data.tp)} · R:R ${data.rr.toFixed(2)}${rationale ? ` — ${rationale}` : ''}`
      const rows = notifyUserIds.map((uid) => ({
        user_id: uid,
        type: 'signal_alert',
        title,
        body,
        data: {
          alert_id: inserted.id,
          pair,
          grade,
          direction: data.direction,
          entry: round(data.entry),
          sl: round(data.sl),
          tp: round(data.tp),
          rr: Number(data.rr.toFixed(2)),
        },
      }))
      // Chunk to avoid oversize inserts
      for (let i = 0; i < rows.length; i += 500) {
        await supabaseAdmin.from('user_notifications').insert(rows.slice(i, i + 500))
      }
    }

    // 4. Queue emails
    let enqueued = 0
    if (recipients.length > 0) {
      const { default: React } = await import('react')
      const { render } = await import('@react-email/render')
      const { template } = await import('@/lib/email-templates/signal-alert')

      const templateData = {
        pair,
        grade: grade as 'A+' | 'A',
        direction: data.direction,
        entry: round(data.entry).toFixed(data.decimals),
        sl: round(data.sl).toFixed(data.decimals),
        tp: round(data.tp).toFixed(data.decimals),
        rr: data.rr.toFixed(2),
        confidence: Math.round(data.confidence),
        session: data.session ?? '',
        killzone: data.killzone ?? '',
        htfBias: data.htfBias ?? '',
        rationale: data.rationale ?? '',
        firedAt: inserted.fired_at,
        signalUrl: 'https://jenvu.com/signal',
      }
      const element = React.createElement(template.component, templateData)
      const html = await render(element)
      const text = await render(element, { plainText: true })
      const subject =
        typeof template.subject === 'function' ? template.subject(templateData) : template.subject

      for (const { email } of recipients) {
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
        const idempotencyKey = `alert-${inserted.id}-${normalized}`

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
    }

    return {
      ok: true,
      alert_id: inserted.id,
      recipients: recipients.length,
      enqueued,
      notified_in_app: notifyUserIds.length,
    }
  })
