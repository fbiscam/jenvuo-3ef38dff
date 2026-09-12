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

export function isGoldSymbol(symbol: string): boolean {
  const normalized = symbol.toUpperCase().replace(/[^A-Z]/g, '')
  return normalized === 'XAU' || normalized === 'GOLD' || normalized === 'XAUUSD'
}