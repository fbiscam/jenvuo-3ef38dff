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

const MAX_ACTIVE_KEYS = 5

export const listExtensionKeys = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from('extension_api_keys')
      .select('id,name,key_prefix,last_used_at,revoked_at,created_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
    if (error) return { ok: false as const, error: error.message, keys: [] as ExtensionKeyRow[] }
    return { ok: true as const, keys: (data ?? []) as ExtensionKeyRow[] }
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

    const { count } = await (context.supabase as any)
      .from('extension_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', context.userId)
      .is('revoked_at', null)
    if (typeof count === 'number' && count >= MAX_ACTIVE_KEYS) {
      return { ok: false as const, error: `You already have ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` }
    }

    const raw = generateExtensionKey()
    const key_hash = await hashExtensionKey(raw)

    const { error } = await (context.supabase as any).from('extension_api_keys').insert({
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
