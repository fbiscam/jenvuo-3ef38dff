import { createFileRoute } from '@tanstack/react-router'
import { authenticateExtensionRequest, extJson, EXT_CORS_HEADERS } from '@/lib/extension-auth.server'
import { computeSignalPlan } from '@/lib/gold-analysis.functions'

async function handle({ request }: { request: Request }) {
  const auth = await authenticateExtensionRequest(request)
  if (!auth.ok) return extJson({ ok: false, error: auth.error }, auth.status)

  let symbol = 'XAUUSD'
  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as { symbol?: string }
      if (typeof body?.symbol === 'string' && body.symbol.trim()) symbol = body.symbol.trim()
    } catch { /* default symbol */ }
  } else {
    const q = new URL(request.url).searchParams.get('symbol')
    if (q) symbol = q
  }

  try {
    const plan = await computeSignalPlan({ symbol }, auth.userId)
    return extJson({ ok: true, plan })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed.'
    return extJson({ ok: false, error: message }, 502)
  }
}

export const Route = createFileRoute('/api/public/extension/analyze')({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: EXT_CORS_HEADERS }),
      GET: handle,
      POST: handle,
    },
  },
})
