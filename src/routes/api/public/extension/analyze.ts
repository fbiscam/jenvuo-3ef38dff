import { createFileRoute } from '@tanstack/react-router'
import { authenticateExtensionRequest, extJson, EXT_CORS_HEADERS } from '@/lib/extension-auth.server'
import { computeSignalPlan, isSupportedTradeableSymbol } from '@/lib/gold-analysis.functions'

async function handle({ request }: { request: Request }) {
  const auth = await authenticateExtensionRequest(request)
  if (!auth.ok) return extJson({ ok: false, error: auth.error }, auth.status)
  // Analysis chooses several models internally; a scoped key may never bypass its model list.
  if (auth.allowedModels !== null) return extJson({ ok: false, error: 'Use chat completions with a selected model, or an all-models key for multi-model analysis.' }, 403)

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
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
    const { getExtensionEntitlement } = await import('@/lib/extension-billing.server')
    const entitlement = await getExtensionEntitlement(auth.userId)
    if (!entitlement.allowed) return extJson({ ok: false, error: entitlement.error, code: entitlement.status === 402 ? 'LOW_BALANCE' : 'PLAN_REQUIRED', balance: entitlement.balance }, entitlement.status)
    if (!isSupportedTradeableSymbol(symbol)) {
      return extJson({
        ok: false,
        code: 'UNSUPPORTED_INSTRUMENT',
        error: 'Unsupported market symbol. Enter the exact symbol shown on your chart.',
      }, 400)
    }
    const plan = await computeSignalPlan({ symbol }, auth.userId, {
      scanId: requestId,
      extensionBilling: { keyId: auth.keyId, keyName: auth.name, planId: entitlement.plan },
    })
    return extJson({ ok: true, plan, requestId })
  } catch (e) {
    console.error('[extension/analyze] failed', e)
    return extJson({ ok: false, error: 'Analysis is temporarily unavailable. Please try again.' }, 502)
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
