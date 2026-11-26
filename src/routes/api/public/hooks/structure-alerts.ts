import { createFileRoute } from '@tanstack/react-router'

// Fresh high/low email alerts. Called every 5 min by pg_cron (x-cron-secret). Recipients: active Pro/Elite/Ultra only.
// Scans XAU/USD, EUR/USD, BTC/USD on 1H only closed candles; each swing is
// emailed once (structure_alert_sends primary key dedupes).

const PAIR_NAME: Record<string, string> = { XAUUSD: 'XAU/USD', EURUSD: 'EUR/USD', BTCUSD: 'BTC/USD' }

function fmtUtc(ms: number) {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}

function fmtPrice(asset: string, p: number) {
  return p.toFixed(asset === 'EURUSD' ? 5 : 2)
}

export const Route = createFileRoute('/api/public/hooks/structure-alerts')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedCronRequest, cronUnauthorized } = await import('@/lib/cron-guard.server')
        if (!(await isAuthorizedCronRequest(request))) return cronUnauthorized()
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { loadTerminalChart } = await import('@/lib/gold-analysis.functions')
        const { detectStructureAlerts, ALERT_ASSETS, ALERT_TIMEFRAMES } = await import('@/lib/structure-alerts')
        const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
        const db = supabaseAdmin as any

        const { receivesStructureAlerts } = await import('@/lib/structure-alerts')
        const { data: subs } = await db.from('user_subscriptions').select('user_id,plan_id,status,is_trial,current_period_end').in('plan_id', ['pro', 'elite', 'ultra'])
        const ids: string[] = Array.from(new Set<string>((subs ?? []).filter((s: any) => receivesStructureAlerts(s)).map((s: any) => String(s.user_id))))
        const emails = (await Promise.all(ids.map(async (id: string) => {
          const { data } = await supabaseAdmin.auth.admin.getUserById(id)
          return data?.user?.email ?? null
        }))).filter((e): e is string => !!e)

        const results: Array<{ key: string; sent: number }> = []
        const errors: string[] = []
        for (const asset of ALERT_ASSETS) {
          for (const tf of ALERT_TIMEFRAMES) {
            try {
              const payload = await loadTerminalChart(tf, asset)
              const now = payload.serverTime ?? Date.now()
              const closed = payload.bars.filter((b) => (b.time + payload.stepSeconds) * 1000 <= now)
              for (const alert of detectStructureAlerts(asset, tf, closed)) {
                const { error: dup } = await db.from('structure_alert_sends').insert({
                  alert_key: alert.key, asset, timeframe: tf, label: alert.label, price: alert.price,
                  swing_at: new Date(alert.swingTime).toISOString(),
                  price_action: alert.priceAction, sweep: alert.sweep,
                })
                if (dup) continue // already emailed
                let sent = 0
                for (const to of emails) {
                  try {
                    await sendTemplateEmail('structure-alert', to, {
                      idempotencyKey: `structure-alert:${alert.key}:${to}`,
                      templateData: {
                        pair: PAIR_NAME[asset], timeframe: tf.toUpperCase(), label: alert.label,
                        price: fmtPrice(asset, alert.price), swingTime: fmtUtc(alert.swingTime),
                        confirmedTime: fmtUtc(alert.confirmedTime + payload.stepSeconds * 1000),
                        priceAction: alert.priceAction, sweep: alert.sweep,
                        chartUrl: 'https://dash.jenvu.com/terminal',
                      },
                    })
                    sent++
                  } catch (e) {
                    errors.push(`${alert.key}: ${(e as Error).message}`)
                  }
                }
                results.push({ key: alert.key, sent })
              }
            } catch (e) {
              errors.push(`${asset}:${tf}: ${(e as Error).message}`)
            }
          }
        }
        return Response.json({ ok: true, recipients: emails.length, alerts: results, errors })
      },
    },
  },
})
