// Server-only helper: filter user ids down to those who want an email for a
// specific signal (alerts_enabled + email_enabled + per-user grade/pair/direction filters).
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export async function filterAlertsEnabledUserIds(userIds: string[]): Promise<string[]> {
  if (!userIds || userIds.length === 0) return []
  const { data } = await supabaseAdmin
    .from('alert_preferences')
    .select('user_id, alerts_enabled')
    .in('user_id', userIds)
  const disabled = new Set(
    ((data ?? []) as Array<{ user_id: string; alerts_enabled: boolean }>)
      .filter((r) => r.alerts_enabled === false)
      .map((r) => r.user_id),
  )
  return userIds.filter((id) => !disabled.has(id))
}

export interface EmailAlertFilter {
  grade: string
  pair: string
  direction: 'BUY' | 'SELL'
}

/**
 * Given a list of paid user ids and a specific signal, return the subset who
 * want the email based on their per-user filters (email_enabled, grade, pair,
 * direction). Defaults to opt-in when a preference row doesn't exist yet.
 */
export async function filterEmailRecipientIds(
  userIds: string[],
  s: EmailAlertFilter,
): Promise<string[]> {
  if (!userIds || userIds.length === 0) return []
  const { data } = await supabaseAdmin
    .from('alert_preferences')
    .select('user_id, alerts_enabled, email_enabled, email_grades, email_pairs, email_directions')
    .in('user_id', userIds)
  type Row = {
    user_id: string
    alerts_enabled: boolean
    email_enabled: boolean
    email_grades: string[] | null
    email_pairs: string[] | null
    email_directions: string[] | null
  }
  const byId = new Map<string, Row>()
  for (const r of (data ?? []) as Row[]) byId.set(r.user_id, r)

  const pair = s.pair.toUpperCase()
  return userIds.filter((id) => {
    const r = byId.get(id)
    if (!r) return true // no prefs row yet → default opt-in
    if (r.alerts_enabled === false) return false
    if (r.email_enabled === false) return false
    if (r.email_grades && r.email_grades.length > 0 && !r.email_grades.includes(s.grade)) return false
    if (r.email_pairs && r.email_pairs.length > 0 && !r.email_pairs.includes(pair)) return false
    if (r.email_directions && r.email_directions.length > 0 && !r.email_directions.includes(s.direction)) return false
    return true
  })
}
