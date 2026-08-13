import { supabaseAdmin } from '@/integrations/supabase/client.server'

type AlertRow = {
  id: string
  pair: string
  direction: string
  entry: number
  sl: number
  tp: number
  rr: number | null
  confidence: number | null
  grade: string | null
  session: string | null
  killzone: string | null
  htf_bias: string | null
  rationale: string | null
  fired_at: string
}

const ALERT_COLS =
  'id, pair, direction, entry, sl, tp, rr, confidence, grade, session, killzone, htf_bias, rationale, fired_at'

async function getAlert(alertId: string): Promise<AlertRow | null> {
  const { data } = await supabaseAdmin
    .from('signal_alerts')
    .select(ALERT_COLS)
    .eq('id', alertId)
    .maybeSingle()
  return (data as AlertRow | null) ?? null
}

/**
 * Log the alert as a trade in the user's journal. Inserted as `pending`
 * so the existing auto-tracker flips it to open at entry and then
 * closes it on TP/SL exactly like the in-app "Trade Done" button.
 */
export async function telegramTradeDone(
  userId: string,
  alertId: string,
): Promise<{ ok: boolean; message: string }> {
  const alert = await getAlert(alertId)
  if (!alert) return { ok: false, message: '⚠️ This signal is no longer available.' }

  const direction = alert.direction.toUpperCase() === 'BUY' ? 'long' : 'short'

  const { data: existing } = await supabaseAdmin
    .from('trade_journal')
    .select('id')
    .eq('user_id', userId)
    .eq('pair', alert.pair)
    .eq('entry', alert.entry)
    .eq('stop_loss', alert.sl)
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, message: 'ℹ️ This trade is already in your journal.' }
  }

  const { error } = await supabaseAdmin.from('trade_journal').insert({
    user_id: userId,
    pair: alert.pair,
    direction,
    entry: alert.entry,
    stop_loss: alert.sl,
    take_profit: alert.tp,
    outcome: 'pending',
    notes: `Logged from Telegram alert · Conf ${Math.round(Number(alert.confidence ?? 0))}%${alert.killzone ? ` · ${alert.killzone}` : ''}`,
  } as never)
  if (error) return { ok: false, message: '⚠️ Could not log the trade. Please try again.' }

  return {
    ok: true,
    message: `✅ <b>Trade logged</b> — ${alert.pair} ${alert.direction.toUpperCase()}\nIt now shows in your dashboard → Trades and closes automatically on TP or SL.`,
  }
}

/** Save the alert to the user's Saved signals, same shape as the web app. */
export async function telegramSaveSignal(
  userId: string,
  alertId: string,
): Promise<{ ok: boolean; message: string }> {
  const alert = await getAlert(alertId)
  if (!alert) return { ok: false, message: '⚠️ This signal is no longer available.' }

  const { data: existing } = await supabaseAdmin
    .from('saved_signals')
    .select('id')
    .eq('user_id', userId)
    .eq('alert_id', alertId)
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, message: 'ℹ️ This signal is already saved.' }
  }

  const snapshot = {
    pair: alert.pair,
    direction: alert.direction.toUpperCase() === 'BUY' ? 'long' : 'short',
    entry: alert.entry,
    stop_loss: alert.sl,
    take_profit: alert.tp,
    rr: alert.rr,
    confidence: alert.confidence,
    grade: alert.grade,
    session: alert.session,
    killzone: alert.killzone,
    htf_bias: alert.htf_bias,
    rationale: alert.rationale,
    source: 'telegram',
    saved_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin.from('saved_signals').insert({
    user_id: userId,
    alert_id: alertId,
    snapshot: snapshot as never,
    notes: `${alert.pair} · ${alert.direction.toUpperCase()} · Conf ${Math.round(Number(alert.confidence ?? 0))}%`,
  } as never)
  if (error) return { ok: false, message: '⚠️ Could not save the signal. Please try again.' }

  return {
    ok: true,
    message: `🔖 <b>Signal saved</b> — ${alert.pair} ${alert.direction.toUpperCase()}\nOpen your dashboard → Saved signals to review it.`,
  }
}
