/**
 * Shared helpers for the Jenvu browser-extension API keys.
 * Keys are shown to the user exactly once; only a SHA-256 hash is stored.
 */

export const EXT_KEY_PREFIX = 'jenvu_ext_'

export async function hashExtensionKey(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw.trim()))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateExtensionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const body = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${EXT_KEY_PREFIX}${body}`
}

export type ExtensionAuthResult =
  | { ok: true; userId: string; keyId: string; name: string }
  | { ok: false; status: number; error: string }

/** Validates an API key coming from the extension and marks it as used. */
export async function authenticateExtensionRequest(request: Request): Promise<ExtensionAuthResult> {
  const header = request.headers.get('authorization') || ''
  const raw = (header.replace(/^Bearer\s+/i, '').trim() || request.headers.get('x-jenvu-key') || '').trim()

  if (!raw || !raw.startsWith(EXT_KEY_PREFIX)) {
    return { ok: false, status: 401, error: 'Missing or malformed API key.' }
  }

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const admin = supabaseAdmin as any
  const keyHash = await hashExtensionKey(raw)

  const { data, error } = await admin
    .from('extension_api_keys')
    .select('id,user_id,name,revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error) return { ok: false, status: 500, error: 'Key lookup failed.' }
  if (!data) return { ok: false, status: 401, error: 'Invalid API key.' }
  if (data.revoked_at) return { ok: false, status: 401, error: 'This API key was revoked.' }

  try {
    await admin.from('extension_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  } catch {
    /* usage bookkeeping must never block the request */
  }

  return { ok: true, userId: data.user_id as string, keyId: data.id as string, name: (data.name as string) || 'Extension key' }
}

export const EXT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-jenvu-key, content-type',
  'Access-Control-Max-Age': '86400',
}

export function extJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...EXT_CORS_HEADERS },
  })
}
