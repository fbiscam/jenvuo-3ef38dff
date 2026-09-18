import { estimateCostUsd, logAiCost } from '@/lib/ai-cost-log.server'
import { getEffectiveDailyTokenLimit, getPlanCapabilities } from '@/lib/plan-entitlements'

export const EXTENSION_BASE_FEE_USD = 0
export const EXTENSION_TOKEN_PRICE_MULTIPLIER = 0.5
export const EXTENSION_PRIMARY_REQUEST_FEE_USD = 0.03
export const EXTENSION_SENIOR_REVIEW_FEE_USD = 0.2

type Usage = { promptTokens: number; completionTokens: number; totalTokens?: number }
type ModelCall = { model: string; usage: Usage; stage: string }

export function startOfUtcDay(now = new Date()): string {
  const d = new Date(now)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Tokens (prompt + completion) charged to this user since 00:00 UTC today. */
export async function readDailyTokenUsage(client: any, userId: string) {
  const { data } = await client
    .from('credit_ledger')
    .select('prompt_tokens, completion_tokens, metadata, created_at')
    .eq('user_id', userId)
    .eq('reason', 'extension_api')
    .gte('created_at', startOfUtcDay())
    .limit(2000)
  const byKey = new Map<string, { tokens: number; requests: number }>()
  let total = 0
  for (const row of (data ?? []) as any[]) {
    const tokens = Number(row.prompt_tokens ?? 0) + Number(row.completion_tokens ?? 0)
    total += tokens
    const keyId = String(row.metadata?.api_key_id ?? 'unknown')
    const entry = byKey.get(keyId) ?? { tokens: 0, requests: 0 }
    entry.tokens += tokens
    entry.requests += 1
    byKey.set(keyId, entry)
  }
  return { total, byKey }
}

export async function getExtensionEntitlement(userId: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const admin = supabaseAdmin as any
  const [{ data: sub }, { data: bal }] = await Promise.all([
    admin.from('user_subscriptions').select('plan_id,status,is_trial,trial_ends_at,current_period_end').eq('user_id', userId).maybeSingle(),
    admin.from('credit_balances').select('balance').eq('user_id', userId).maybeSingle(),
  ])
  const expiry = sub?.trial_ends_at || sub?.current_period_end
  const trialValid = !sub?.is_trial || (Boolean(expiry) && new Date(expiry).getTime() > Date.now())
  const active = Boolean(sub && (sub.status === 'active' || sub.status === 'trialing') && trialValid)
  const planId = active ? String(sub.plan_id || 'free') : 'free'
  const { data: plan } = await admin.from('plans').select('wallet_usd,extension_key_limit').eq('id', planId).maybeSingle()
  const keyLimit = Number(plan?.extension_key_limit ?? 0)
  const balance = Number(bal?.balance ?? 0)
  const capabilities = getPlanCapabilities(planId)
  const dailyTokenLimit = getEffectiveDailyTokenLimit(planId, balance)
  const { total: tokensUsedToday } = await readDailyTokenUsage(admin, userId)
  const tokensRemainingToday = Math.max(0, dailyTokenLimit - tokensUsedToday)
  const overDailyTokens = dailyTokenLimit > 0 && tokensUsedToday >= dailyTokenLimit
  const planOk = active && capabilities.extensionAi && keyLimit > 0
  const result = {
    allowed: planOk && balance > 0 && !overDailyTokens,
    status: !planOk ? 403 : balance <= 0 ? 402 : overDailyTokens ? 429 : 200,
    plan: planId,
    keyLimit,
    balance,
    wallet: Number(plan?.wallet_usd ?? 0),
    markup: EXTENSION_TOKEN_PRICE_MULTIPLIER,
    seniorReview: capabilities.seniorReview,
    capabilities,
    dailyTokenLimit,
    tokensUsedToday,
    tokensRemainingToday,
  }
  return {
    ...result,
    error: result.allowed ? undefined
      : result.status === 429
        ? `Daily token limit reached (${dailyTokenLimit.toLocaleString()} tokens). Add credits to increase the balance-based allowance, or wait until 00:00 UTC.`
        : result.status === 402
          ? 'Low balance. Add funds to continue using extension AI.'
          : 'Extension AI is not included in your current plan. Upgrade to Pro, Elite, or Ultra to continue.',
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
  const hasSeniorReview = params.calls.some((call) => call.stage === 'extension-senior-review' || call.stage === 'senior-review')
  const charged = hasSeniorReview
    ? EXTENSION_SENIOR_REVIEW_FEE_USD
    : EXTENSION_PRIMARY_REQUEST_FEE_USD
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
       pricing_multiplier: EXTENSION_TOKEN_PRICE_MULTIPLIER, pricing_basis: hasSeniorReview ? 'fixed_senior_review_request' : 'fixed_primary_request',
       charge_usd: charged, senior_review: hasSeniorReview,
       primary_request_fee_usd: hasSeniorReview ? 0 : EXTENSION_PRIMARY_REQUEST_FEE_USD,
       senior_review_fee_usd: hasSeniorReview ? EXTENSION_SENIOR_REVIEW_FEE_USD : 0,
    },
  })
  if (error) {
    const low = String(error.message || '').includes('INSUFFICIENT_CREDITS')
    return { ok: false, charged: 0, error: low ? 'Low balance. Add funds to continue using extension AI.' : 'Usage could not be recorded.' }
  }
  await Promise.all(params.calls.map((call) => logAiCost({ userId: params.userId, stage: call.stage, model: call.model, usage: call.usage })))
  return { ok: true, charged, balance: Number(data ?? entitlement.balance - charged) }
}