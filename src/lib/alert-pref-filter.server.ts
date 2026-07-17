// Server-only helper: filter a list of user ids down to those with alerts_enabled = true.
// Users default to enabled; only rows explicitly set to false are excluded.
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
