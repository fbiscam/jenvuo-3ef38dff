import { createFileRoute } from '@tanstack/react-router'

function providerUrl(path: 'models' | 'chat/completions'): string | null {
  const raw = (process.env.CUSTOM_AI_BASE_URL || '').trim().replace(/\/+$/, '')
  if (!/^https:\/\//i.test(raw)) return null
  const root = raw.replace(/\/chat\/completions$/i, '').replace(/\/models$/i, '').replace(/\/v1$/i, '')
  return `${root}/v1/${path}`
}

export const Route = createFileRoute('/api/public/provider-probe')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (request.headers.get('x-local-probe') !== 'jenvu-provider-check') {
          return new Response('Not found', { status: 404 })
        }
        const endpoint = providerUrl('models')
        const key = process.env.CUSTOM_AI_API_KEY
        if (!endpoint || !key) return Response.json({ ok: false, error: 'Provider details are unavailable.' }, { status: 503 })

        try {
          const response = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(15_000),
          })
          const body = await response.text()
          if (!response.ok) return Response.json({ ok: false, status: response.status, error: body.slice(0, 500) })
          const parsed = JSON.parse(body) as { data?: Array<{ id?: unknown }> }
          const models = (parsed.data || []).map((item) => item.id).filter((id): id is string => typeof id === 'string')
          return Response.json({ ok: true, status: response.status, models })
        } catch (error) {
          return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Provider request failed.' })
        }
      },
      POST: async ({ request }) => {
        if (request.headers.get('x-local-probe') !== 'jenvu-provider-check') {
          return new Response('Not found', { status: 404 })
        }
        const endpoint = providerUrl('chat/completions')
        const key = process.env.CUSTOM_AI_API_KEY
        const input = await request.json().catch(() => null) as { model?: unknown } | null
        if (!endpoint || !key || typeof input?.model !== 'string') {
          return Response.json({ ok: false, error: 'Provider details or model are unavailable.' }, { status: 400 })
        }

        try {
          const startedAt = Date.now()
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: input.model,
              messages: [{ role: 'user', content: 'Reply with exactly: READY' }],
              max_tokens: 16,
              temperature: 0,
            }),
            signal: AbortSignal.timeout(30_000),
          })
          const body = await response.text()
          if (!response.ok) return Response.json({ ok: false, model: input.model, status: response.status, error: body.slice(0, 500) })
          const parsed = JSON.parse(body) as { choices?: Array<{ message?: { content?: unknown } }> }
          return Response.json({
            ok: true,
            model: input.model,
            latencyMs: Date.now() - startedAt,
            replied: typeof parsed.choices?.[0]?.message?.content === 'string',
          })
        } catch (error) {
          return Response.json({ ok: false, model: input.model, error: error instanceof Error ? error.message : 'Provider request failed.' })
        }
      },
    },
  },
})