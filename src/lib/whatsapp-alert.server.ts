import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { filterAlertsEnabledUserIds } from '@/lib/alert-pref-filter.server'

interface SignalAlertArgs {
  alertId: string
  pair: string
  grade: string
  direction: string
  entry: number
  sl: number
  tp: number
  rr: number
  confidence: number
  decimals: number
  rationale?: string | null
  session?: string | null
  killzone?: string | null
  htfBias?: string | null
}

function escapeText(text: string): string {
  // WhatsApp formatting: *bold*, _italic_, ~strikethrough~, ```code```
  return text.replace(/[*_~`]/g, '\\$&')
}


export async function sendSignalAlertWhatsApp(a: SignalAlertArgs): Promise<{ sent: number }> {
  // 1. Get recipients who have WhatsApp enabled and verified
  const { data: paidRows } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id')
    .eq('status', 'active')
    .neq('plan_id', 'free')
  
  let paidIds = Array.from(new Set((paidRows ?? []).map((r) => r.user_id)))
  paidIds = await filterAlertsEnabledUserIds(paidIds, { 
    grade: a.grade as any, 
    pair: a.pair, 
    direction: a.direction as any 
  })
  
  if (paidIds.length === 0) return { sent: 0 }

  const { data: links } = await supabaseAdmin
    .from('whatsapp_alert_links')
    .select('user_id, phone_number')
    .in('user_id', paidIds)
    .eq('whatsapp_enabled', true)
    .not('verified_at', 'is', null)

  const rows = (links ?? []) as Array<{ user_id: string; phone_number: string }>
  if (rows.length === 0) return { sent: 0 }

  // 2. Format message
  const round = (n: number) => Number(n.toFixed(a.decimals)).toFixed(a.decimals)
  const title = `*${a.direction} · ${a.pair}*`
  
  const messageBody = [
    title,
    '',
    `Grade: *${a.grade}*`,
    `Entry: *${round(a.entry)}*`,
    `SL: *${round(a.sl)}*`,
    `TP: *${round(a.tp)}*`,
    `R:R: *1:${a.rr.toFixed(2)}*`,
    `Confidence: *${Math.round(a.confidence)}%*`,
    a.session ? `Session: *${a.session}*` : '',
    a.killzone ? `Killzone: *${a.killzone}*` : '',
    '',
    a.rationale ? `_Why this ${a.direction.toLowerCase()}:_\n${a.rationale.slice(0, 500)}` : '',
    '',
    `View details: https://jenvu.com/signal?alertId=${a.alertId}`
  ].filter(Boolean).join('\n')

  const templateParams: [string, string] = [
    `${a.direction} ${a.pair} (Grade ${a.grade})`,
    `Entry ${round(a.entry)}, SL ${round(a.sl)}, TP ${round(a.tp)}, R:R ${a.rr.toFixed(2)}, Confidence ${Math.round(a.confidence)}%`,
  ]

  const { sendWhatsappAlertMessage } = await import('./whatsapp-api.server')

  let sent = 0
  for (const row of rows) {
    try {
      // Free-form text works inside the 24h window; otherwise the approved
      // utility template is used automatically.
      await sendWhatsappAlertMessage(row.phone_number, messageBody, templateParams)

      
      sent++
      await supabaseAdmin
        .from('whatsapp_alert_links')
        .update({ last_error: null })
        .eq('user_id', row.user_id)
    } catch (error) {
      console.error(`[WhatsApp] Failed to send to ${row.user_id}:`, error)
      await supabaseAdmin
        .from('whatsapp_alert_links')
        .update({ last_error: (error as Error).message.slice(0, 500) })
        .eq('user_id', row.user_id)
    }
  }

  return { sent }
}
