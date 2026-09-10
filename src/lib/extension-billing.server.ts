import { estimateCostUsd, logAiCost } from '@/lib/ai-cost-log.server'

export const EXTENSION_BASE_FEE_USD = 0.02

type Usage = { promptTokens: number; completionTokens: number; totalTokens?: number }
type ModelCall = { model: string; usage: Usage; stage: string }

export async function getExtensionEntitlement(userId: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const admin = supabaseAdmin as any
  const [{ data: sub }, { data: bal }] = await Promise.all([
    admin.from('user_subscriptions').select('plan_id,status').eq('user_id', userId).maybeSingle(),
    admin.from('credit_balances').select('balance').eq('user_id', userId).maybeSingle(),
  ])
  const active = Boolean(sub && (sub.status === 'active' || sub.status === 'trialing'))
  const planId = active ? String(sub.plan_id || 'free') : 'free'
  const { data: plan } = await admin.from('plans').select('wallet_usd,markup_multiplier,extension_key_limit').eq('id', planId).maybeSingle()
  const keyLimit = Number(plan?.extension_key_limit ?? 0)
  const balance = Number(bal?.balance ?? 0)
  const result = {
    allowed: active && planId !== 'free' && keyLimit > 0 && balance >= EXTENSION_BASE_FEE_USD,
    status: !active || planId === 'free' || keyLimit < 1 ? 403 : balance < EXTENSION_BASE_FEE_USD ? 402 : 200,
    plan: planId,
    keyLimit,
    balance,
    wallet: Number(plan?.wallet_usd ?? 0),
    markup: Math.max(1, Number(plan?.markup_multiplier ?? 2)),
  }
  return {
    ...result,
    error: result.allowed ? undefined : result.status === 402
      ? 'Low balance. Add funds to continue using extension AI.'
      : 'A paid Pro, Elite, or Ultra plan is required for extension AI.',
  }
}

export async function chargeExtensionUsage(params: {
  userId: string
  keyId: string
  keyName: string
  requestId: string
  action: string
  calls: ModelCall[]
}): Promise<{ ok: boolean; charged: number; balance?: number; error?: string }> {
  const entitlement = await getExtensionEntitlement(params.userId)
  if (!entitlement.allowed) return { ok: false, charged: 0, error: entitlement.error }
  const rawCost = params.calls.reduce((sum, call) => sum + estimateCostUsd(call.model, call.usage.promptTokens, call.usage.completionTokens), 0)
  const charged = Number((EXTENSION_BASE_FEE_USD + rawCost * entitlement.markup).toFixed(6))
  if (entitlement.balance < charged) return { ok: false, charged: 0, error: 'Low balance. Add funds to continue using extension AI.' }

  const primary = params.calls[0]
  const senior = params.calls[1]
  const promptTokens = params.calls.reduce((sum, call) => sum + call.usage.promptTokens, 0)
  const completionTokens = params.calls.reduce((sum, call) => sum + call.usage.completionTokens, 0)
  const models = params.calls.map((call) => call.model).join(',')
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data, error } = await (supabaseAdmin as any).rpc('charge_extension_usage', {
    _user_id: params.userId,
    _amount: charged,
    _request_id: params.requestId,
    _metadata: {
      request_id: params.requestId, api_key_id: params.keyId, api_key_name: params.keyName,
      action: params.action, model: models, primary_model: primary?.model ?? null,
      senior_model: senior?.model ?? null, stage: 'extension_api', prompt_tokens: promptTokens,
      completion_tokens: completionTokens, raw_cost_usd: rawCost, base_fee_usd: EXTENSION_BASE_FEE_USD,
      markup_multiplier: entitlement.markup, charge_usd: charged, senior_review: Boolean(senior),
    },
  })
  if (error) {
    const low = String(error.message || '').includes('INSUFFICIENT_CREDITS')
    return { ok: false, charged: 0, error: low ? 'Low balance. Add funds to continue using extension AI.' : 'Usage could not be recorded.' }
  }
  await Promise.all(params.calls.map((call) => logAiCost({ userId: params.userId, stage: call.stage, model: call.model, usage: call.usage })))
  return { ok: true, charged, balance: Number(data ?? entitlement.balance - charged) }
}