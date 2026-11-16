import { securityHoldUntil } from './two-factor'

/** End of the 24h hold after a server-recorded new-device sign-in (ms), or null. */
export async function readSecurityHold(userId: string): Promise<number | null> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data } = await (supabaseAdmin as any)
    .from('login_events')
    .select('is_new,created_at')
    .eq('user_id', userId)
    .eq('is_new', true)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(20)
  return securityHoldUntil((data ?? []) as { is_new: boolean; created_at: string }[], Date.now())
}
