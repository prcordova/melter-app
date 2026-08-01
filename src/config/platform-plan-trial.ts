import type { PlanBillingInterval } from './plan-billing'

export const PLATFORM_PLAN_OFFER_MODES = [
  'FREE_TRIAL',
  'MONEY_BACK',
  'DIRECT',
] as const

export type PlatformPlanOfferMode = (typeof PLATFORM_PLAN_OFFER_MODES)[number]

export const DEFAULT_PLATFORM_PLAN_OFFER_DAYS = 7
export const PLATFORM_PLAN_TRIAL_DAYS = DEFAULT_PLATFORM_PLAN_OFFER_DAYS

export function isPlatformPlanOfferMode(
  value: unknown
): value is PlatformPlanOfferMode {
  return (
    typeof value === 'string' &&
    (PLATFORM_PLAN_OFFER_MODES as readonly string[]).includes(value)
  )
}

/**
 * Soft offer 1x: STARTER+ mensal e `platformTrialUsedAt` ainda vazio.
 * O modo vigente (FREE_TRIAL / MONEY_BACK / DIRECT) vem da API `/plans/features`.
 */
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

/** Dentro da janela soft (trial unpaid ou money-back). */
export function isOnPlatformPlanTrial(params: {
  platformTrialUsedAt?: Date | string | null
  expirationDate?: Date | string | null
  platformOfferDaysAtStart?: number | null
  days?: number | null
}): boolean {
  if (!params.platformTrialUsedAt) return false
  const used = new Date(params.platformTrialUsedAt).getTime()
  if (Number.isNaN(used)) return false
  const now = Date.now()
  if (now < used) return false

  const days =
    typeof params.platformOfferDaysAtStart === 'number' &&
    params.platformOfferDaysAtStart > 0
      ? params.platformOfferDaysAtStart
      : typeof params.days === 'number' && params.days > 0
        ? params.days
        : PLATFORM_PLAN_TRIAL_DAYS

  if (params.expirationDate) {
    const exp = new Date(params.expirationDate).getTime()
    if (!Number.isNaN(exp) && now < exp) {
      const legacyWindowMs = (days + 1) * 24 * 60 * 60 * 1000
      if (exp - used <= legacyWindowMs) return true
    }
  }

  return now < used + days * 24 * 60 * 60 * 1000
}

export function shouldRevokePlatformPlanBenefitsOnCancel(params: {
  planType?: string | null | undefined
  platformTrialUsedAt?: Date | string | null
  expirationDate?: Date | string | null
  platformOfferDaysAtStart?: number | null
  days?: number | null
}): boolean {
  return isOnPlatformPlanTrial({
    platformTrialUsedAt: params.platformTrialUsedAt,
    expirationDate: params.expirationDate,
    platformOfferDaysAtStart: params.platformOfferDaysAtStart,
    days: params.days,
  })
}
