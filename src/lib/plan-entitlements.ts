export type PlanCapabilities = {
  extensionAi: boolean
  primaryAnalysis: boolean
  seniorReview: boolean
  multiPairScanner: boolean
  customAlertRules: boolean
  priorityDeskSupport: boolean
}

export function getPlanCapabilities(planId: string): PlanCapabilities {
  const plan = planId.toLowerCase()
  const paid = plan === 'pro' || plan === 'elite' || plan === 'ultra'
  const senior = plan === 'elite' || plan === 'ultra'

  return {
    extensionAi: paid,
    primaryAnalysis: paid,
    seniorReview: senior,
    multiPairScanner: senior,
    customAlertRules: senior,
    priorityDeskSupport: plan === 'ultra',
  }
}

/** USD charged per 1,000,000 tokens of extension/API usage. */
export const TOKEN_RATE_USD_PER_MILLION = 3

/** Daily token allowance per plan (prompt + completion tokens combined). */
export const PLAN_DAILY_TOKEN_LIMITS: Record<string, number> = {
  free: 100_000,
  pro: 1_500_000,
  elite: 5_000_000,
  ultra: 10_000_000,
}

export function getPlanDailyTokenLimit(planId: string): number {
  return PLAN_DAILY_TOKEN_LIMITS[planId.toLowerCase()] ?? 0
}

/** Cost in USD for a given token count at the flat $3 / 1M token rate. */
export function tokensToUsd(tokens: number): number {
  return (Math.max(0, tokens) / 1_000_000) * TOKEN_RATE_USD_PER_MILLION
}

export function isGoldSymbol(symbol: string): boolean {
  const normalized = symbol.toUpperCase().replace(/[^A-Z]/g, '')
  return normalized === 'XAU' || normalized === 'GOLD' || normalized === 'XAUUSD'
}