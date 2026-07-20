import type { PlanBillingInterval } from './plan-billing'

/** Dias de teste grátis no checkout de planos PLATFORM (cartão no mesmo fluxo). */
export const PLATFORM_PLAN_TRIAL_DAYS = 7

/** Planos que podem entrar no trial (LITE fora). */
export const PLATFORM_PLAN_TRIAL_ELIGIBLE_TYPES = [
  'STARTER',
  'PRO',
  'PRO_PLUS',
] as const

export type PlatformPlanTrialEligibleType =
  (typeof PLATFORM_PLAN_TRIAL_ELIGIBLE_TYPES)[number]

export function isPlatformPlanTrialEligibleType(
  planType: string | null | undefined
): planType is PlatformPlanTrialEligibleType {
  return (
    !!planType &&
    (PLATFORM_PLAN_TRIAL_ELIGIBLE_TYPES as readonly string[]).includes(planType)
  )
}

/**
 * Trial 1x por conta: STARTER+ mensal e `platformTrialUsedAt` ainda vazio.
 * Vale para FREE e upgrade.
 */
export function isEligibleForPlatformPlanTrial(params: {
  planType: string | null | undefined
  billingInterval: PlanBillingInterval | string | null | undefined
  platformTrialUsedAt?: Date | string | null
}): boolean {
  if (params.platformTrialUsedAt) return false
  if (params.billingInterval !== 'MONTHLY') return false
  return isPlatformPlanTrialEligibleType(params.planType)
}

export function addPlatformPlanTrialDays(
  from: Date,
  days: number = PLATFORM_PLAN_TRIAL_DAYS
): Date {
  const result = new Date(from)
  result.setDate(result.getDate() + days)
  return result
}

/** Usuário ainda no período de trial (antes da 1ª cobrança). */
export function isOnPlatformPlanTrial(params: {
  platformTrialUsedAt?: Date | string | null
  expirationDate?: Date | string | null
}): boolean {
  if (!params.platformTrialUsedAt || !params.expirationDate) return false
  const used = new Date(params.platformTrialUsedAt).getTime()
  const exp = new Date(params.expirationDate).getTime()
  const now = Date.now()
  if (Number.isNaN(used) || Number.isNaN(exp)) return false
  if (now < used || now >= exp) return false
  const windowMs = (PLATFORM_PLAN_TRIAL_DAYS + 1) * 24 * 60 * 60 * 1000
  return exp - used <= windowMs
}
