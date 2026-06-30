import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

export type SignalAlertRow = {
  id: string
  pair: string
  grade: 'A+' | 'A'
  direction: 'BUY' | 'SELL'
  entry: number
  sl: number
  tp: number
  rr: number | null
  confidence: number | null
  setup_score: number | null
  htf_bias: string | null
  session: string | null
  killzone: string | null
  rationale: string | null
  fired_at: string
}

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  )
}

export const listSignalAlerts = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => {
    const o = (d ?? {}) as { limit?: number; pair?: string }
    return {
      limit: Math.min(Math.max(Number(o.limit) || 20, 1), 50),
      pair: typeof o.pair === 'string' && o.pair ? o.pair.toUpperCase() : null,
    }
  })
  .handler(async ({ data }) => {
    const sb = publicClient()
    let q = sb
      .from('signal_alerts')
      .select(
        'id,pair,grade,direction,entry,sl,tp,rr,confidence,setup_score,htf_bias,session,killzone,rationale,fired_at',
      )
      .order('fired_at', { ascending: false })
      .limit(data.limit)
    if (data.pair) q = q.eq('pair', data.pair)
    const { data: rows, error } = await q
    if (error) return { alerts: [] as SignalAlertRow[], error: error.message }
    return { alerts: (rows ?? []) as SignalAlertRow[] }
  })

export const subscribeToAlerts = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => {
    const o = (d ?? {}) as { email?: string }
    const email = String(o.email ?? '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
      throw new Error('Please enter a valid email address.')
    }
    return { email }
  })
  .handler(async ({ data }) => {
    const sb = publicClient()
    const { error } = await sb
      .from('signal_alert_subscribers')
      .insert({ email: data.email })
    // Treat unique-violation as success (already subscribed)
    if (error && !/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: error.message }
    }
    return { ok: true }
  })
