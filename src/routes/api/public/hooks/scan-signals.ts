import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { computeSignalPlan } from '@/lib/gold-analysis.functions'

// Called by pg_cron every 15 min. Iterates the XAU cross-pair rotation and
// fires A+/A alerts (dedup'd) to opted-in subscribers.

const SENDER_DOMAIN = 'notify.jenvu.com'
const FROM = 'Jenvu Signal Desk <signals@jenvu.com>'
const DEDUPE_WINDOW_MS = 90 * 60 * 1000 // 90 minutes

const XAU_PAIRS = ['XAUUSD', 'XAUEUR', 'XAUGBP', 'XAUJPY', 'XAUAUD', 'XAUCHF']

export const Route = createFileRoute('/api/public/hooks/scan-signals')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const cronSecret = process.env.CRON_SECRET

        if (!supabaseUrl || !serviceKey || !cronSecret) {
          return Response.json({ error: 'server_misconfigured' }, { status: 500 })
        }

        const provided = request.headers.get('x-cron-secret') || ''
        const a = new TextEncoder().encode(provided)
        const b = new TextEncoder().encode(cronSecret)
        let ok = a.length === b.length
        for (let i = 0; i < Math.max(a.length, b.length); i++) ok = ok && a[i % a.length] === b[i % b.length]
        if (!ok || provided !== cronSecret) {
          return Response.json({ error: 'unauthorized' }, { status: 401 })
        }

        let body: { pair?: string; pairs?: string[] } = {}
        try {
          body = (await request.json()) as { pair?: string; pairs?: string[] }
        } catch {
          // empty body ok
        }
        const requested = body.pair ? [body.pair] : body.pairs ?? XAU_PAIRS
        const pairs = requested
          .map((p) => p.toUpperCase().replace(/[^A-Z]/g, ''))
          .filter((p) => XAU_PAIRS.includes(p))
        if (pairs.length === 0) pairs.push('XAUUSD')

        // Gold has a weekend gap — skip when market closed (Fri 22:00 → Sun 22:00 UTC)
        const now = new Date()
        const day = now.getUTCDay()
        const hour = now.getUTCHours()
        const closed =
          day === 6 ||
          (day === 5 && hour >= 22) ||
          (day === 0 && hour < 22)
        if (closed) {
          return Response.json({ ok: true, skipped: 'market_closed' })
        }

        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        const results: Array<Record<string, unknown>> = []
        for (const pair of pairs) {
          const outcome = await scanOnePair(admin, pair)
          results.push({ pair, ...outcome })
        }
        return Response.json({ ok: true, results })
      },
    },
  },
})

async function scanOnePair(
  admin: any,
  pair: string,
): Promise<Record<string, unknown>> {

  let plan
  try {
    plan = await computeSignalPlan({ symbol: pair })
  } catch (e) {
    console.error('scan-signals: analyzer failed', pair, e)
    return { error: 'analyzer_failed', message: String(e) }
  }

  const grade = plan.setupGrade
  const direction = plan.trade.direction
  const acceptableGrades = ['A+', 'A']
  if (!acceptableGrades.includes(grade) || (direction !== 'BUY' && direction !== 'SELL') || plan.setupScore < 72) {
    return { skipped: 'below_threshold', grade, direction, score: plan.setupScore }
  }

  const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()
  const { data: recent } = await admin
    .from('signal_alerts')
    .select('id, direction, fired_at')
    .eq('pair', pair)
    .gte('fired_at', since)
    .order('fired_at', { ascending: false })
    .limit(1)
  if (recent && recent.length && recent[0].direction === direction) {
    return { skipped: 'duplicate' }
  }

  const dec = plan.instrument.decimals
  const round = (n: number) => Number(n.toFixed(dec))
  const rationale =
    plan.trade.summary ||
    plan.confluences.slice(0, 3).join(' · ') ||
    'High-confluence institutional setup detected.'

  const { data: inserted, error: insertErr } = await admin
    .from('signal_alerts')
    .insert({
      pair,
      grade,
      direction,
      entry: round(plan.trade.entry),
      sl: round(plan.trade.sl),
      tp: round(plan.trade.tp),
      rr: Number(plan.trade.rr.toFixed(2)),
      confidence: Math.round(plan.trade.confidence),
      setup_score: Math.round(plan.setupScore),
      htf_bias: plan.htfBias,
      session: plan.session,
      killzone: plan.killzone,
      rationale: rationale.slice(0, 1000),
    })
    .select()
    .single()

  if (insertErr || !inserted) {
    console.error('scan-signals: insert failed', pair, insertErr)
    return { error: 'insert_failed' }
  }

  const { data: subs } = await admin
    .from('signal_alert_subscribers')
    .select('email')
    .eq('status', 'active')
  const recipients = (subs ?? []).map((s: { email: string | null }) => s.email).filter(Boolean)

  let enqueued = 0
  if (recipients.length > 0) {
    const { default: React } = await import('react')
    const { render } = await import('react-email')
    const { template } = await import('@/lib/email-templates/signal-alert')

    const templateData = {
      pair,
      grade: grade as 'A+' | 'A',
      direction,
      entry: round(plan.trade.entry).toFixed(dec),
      sl: round(plan.trade.sl).toFixed(dec),
      tp: round(plan.trade.tp).toFixed(dec),
      rr: plan.trade.rr.toFixed(2),
      confidence: Math.round(plan.trade.confidence),
      session: plan.session,
      killzone: plan.killzone,
      htfBias: plan.htfBias,
      rationale,
      firedAt: inserted.fired_at,
      signalUrl: 'https://jenvu.com/signal',
    }

    const element = React.createElement(template.component, templateData)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof template.subject === 'function'
        ? template.subject(templateData)
        : template.subject

    for (const email of recipients) {
      const normalized = email.toLowerCase()

      const { data: suppressed } = await admin
        .from('suppressed_emails')
        .select('id')
        .eq('email', normalized)
        .maybeSingle()
      if (suppressed) continue

      let token: string | null = null
      const { data: existing } = await admin
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
        await admin
          .from('email_unsubscribe_tokens')
          .upsert({ token, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
        const { data: stored } = await admin
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

      await admin.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'signal-alert',
        recipient_email: normalized,
        status: 'pending',
      })

      const { error: enqErr } = await admin.rpc('enqueue_email', {
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

      if (enqErr) {
        await admin.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'signal-alert',
          recipient_email: normalized,
          status: 'failed',
          error_message: enqErr.message ?? 'enqueue_failed',
        })
      } else {
        enqueued++
      }
    }
  }

  return {
    alert_id: inserted.id,
    grade,
    direction,
    subscribers: recipients.length,
    enqueued,
  }
}
