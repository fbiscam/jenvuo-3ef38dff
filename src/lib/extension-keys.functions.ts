import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export type ExtensionKeyRow = {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export type ExtensionKeyAccess = { plan: string; planName: string; keyLimit: number; balance: number; wallet: number; active: boolean }

async function readAccess(client: any, userId: string): Promise<ExtensionKeyAccess> {
  const [{ data: sub }, { data: balance }] = await Promise.all([
    client.from('user_subscriptions').select('plan_id,status').eq('user_id', userId).maybeSingle(),
    client.from('credit_balances').select('balance').eq('user_id', userId).maybeSingle(),
  ])
  const active = Boolean(sub && (sub.status === 'active' || sub.status === 'trialing'))
  const planId = active ? String(sub.plan_id || 'free') : 'free'
  const { data: plan } = await client.from('plans').select('name,wallet_usd,extension_key_limit').eq('id', planId).maybeSingle()
  return { plan: planId, planName: String(plan?.name ?? 'Free'), keyLimit: Number(plan?.extension_key_limit ?? 0), balance: Number(balance?.balance ?? 0), wallet: Number(plan?.wallet_usd ?? 0), active }
}

export const listExtensionKeys = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = context.supabase as any
    const [{ data, error }, access] = await Promise.all([client
      .from('extension_api_keys')
      .select('id,name,key_prefix,last_used_at,revoked_at,created_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false }), readAccess(client, context.userId)])
    if (error) return { ok: false as const, error: error.message, keys: [] as ExtensionKeyRow[], access }
    return { ok: true as const, keys: (data ?? []) as ExtensionKeyRow[], access }
  })

export const createExtensionKey = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { name?: string }
    const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 60) : ''
    return { name: name || 'Extension key' }
  })
  .handler(async ({ data, context }) => {
    const { generateExtensionKey, hashExtensionKey } = await import('./extension-auth.server')
    const client = context.supabase as any
    const access = await readAccess(client, context.userId)
    if (!access.active || access.plan === 'free' || access.keyLimit < 1) return { ok: false as const, error: 'Upgrade to Pro, Elite, or Ultra to create an extension API key.' }

    const { count } = await client
      .from('extension_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', context.userId)
      .is('revoked_at', null)
    if (typeof count === 'number' && count >= access.keyLimit) {
      return { ok: false as const, error: `Your ${access.planName} plan allows ${access.keyLimit} active key${access.keyLimit === 1 ? '' : 's'}. Revoke one first.` }
    }

    const raw = generateExtensionKey()
    const key_hash = await hashExtensionKey(raw)

    const { error } = await client.from('extension_api_keys').insert({
      user_id: context.userId,
      name: data.name,
      key_prefix: raw.slice(0, 18),
      key_hash,
    })
    if (error) return { ok: false as const, error: error.message }

    // The raw key is returned exactly once and never stored in plain text.
    return { ok: true as const, key: raw }
  })

export const revokeExtensionKey = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { id?: string }
    if (!obj.id || typeof obj.id !== 'string') throw new Error('Key id is required.')
    return { id: obj.id }
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from('extension_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('user_id', context.userId)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const }
  })
