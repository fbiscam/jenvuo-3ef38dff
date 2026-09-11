import { createFileRoute } from '@tanstack/react-router'
import { authenticateExtensionRequest, extJson, EXT_CORS_HEADERS } from '@/lib/extension-auth.server'

async function handle({ request }: { request: Request }) {
  const auth = await authenticateExtensionRequest(request)
  if (!auth.ok) return extJson({ ok: false, error: auth.error }, auth.status)

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const admin = supabaseAdmin as any

  let email: string | null = null
  let plan = 'free'
  try {
    const { data } = await admin.auth.admin.getUserById(auth.userId)
    email = data?.user?.email ?? null
  } catch { /* optional */ }
  try {
    const { data: sub } = await admin
      .from('user_subscriptions')
      .select('plan_id,status')
      .eq('user_id', auth.userId)
      .maybeSingle()
    if (sub?.plan_id && (sub.status === 'active' || sub.status === 'trialing')) plan = String(sub.plan_id)
  } catch { /* optional */ }

  const { getExtensionEntitlement } = await import('@/lib/extension-billing.server')
  const access = await getExtensionEntitlement(auth.userId)
  return extJson({ ok: true, user: { id: auth.userId, email, plan }, key: { id: auth.keyId, name: auth.name }, access: { keyLimit: access.keyLimit, wallet: access.wallet, balance: access.balance, aiEnabled: access.allowed, seniorReview: access.seniorReview } })
}

export const Route = createFileRoute('/api/public/extension/verify')({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: EXT_CORS_HEADERS }),
      GET: handle,
      POST: handle,
    },
  },
})
