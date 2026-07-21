// Fires the shared auto-scan broadcast pipeline in "manual" mode after a
// user's on-page analyze on /signal succeeds. Bypasses cooldown / two-hit /
// daily cap so a deliberate user scan still delivers to paid subscribers,
// but keeps every safety gate (killzone, HTF align, min conf, dedup,
// freshness, re-quote). The caller is excluded from the broadcast fan-out.
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

interface Input { pair: string }

export const runManualScanBroadcast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => ({
    pair: String(input.pair ?? '').toUpperCase().replace(/[^A-Z]/g, ''),
  }))
  .handler(async ({ data, context }) => {
    const pair = data.pair
    if (!pair || !pair.startsWith('XAU')) {
      return { ok: false as const, error: 'unsupported_pair' }
    }
    const url = process.env.SUPABASE_URL // used only to derive our own origin? No — call our own route.
    const publishable = process.env.SUPABASE_PUBLISHABLE_KEY ?? ''
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    if (!publishable || !svc) return { ok: false as const, error: 'missing_env' }

    // Same-origin call to the public auto-scan hook. The runtime resolves
    // relative URLs against the incoming request, so a bare path works.
    try {
      const res = await fetch('/api/public/hooks/auto-scan', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: publishable,
        },
        body: JSON.stringify({
          manual: true,
          pair,
          manual_token: svc,
          exclude_user_id: context.userId,
        }),
      })
      const body = await res.json().catch(() => ({}))
      return { ok: res.ok, status: res.status, body }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
    void url
  })
