import { PLAN_PRICES, PLAN_PRICES_USD } from './plan-prices';
import type { PlanType } from './plan-features';

export type PlanPriceCurrency = 'BRL' | 'USD'

function planPricesForCurrency(currency: PlanPriceCurrency): Record<PlanType, number> {
  return currency === 'USD' ? PLAN_PRICES_USD : PLAN_PRICES
}

/** Periodicidade de cobrança dos planos da plataforma (STARTER, PRO, PRO+). */
export const PLAN_BILLING_INTERVALS = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const
export type PlanBillingInterval = (typeof PLAN_BILLING_INTERVALS)[number]

/**
 * Trial 7 dias (1x): ver `platform-plan-trial.ts` — STARTER+ mensal no checkout Stripe/MP.
 * Não se aplica a LITE nem a ciclos trimestral/anual.
 */

export const PLAN_BILLING_INTERVAL_MONTHS: Record<PlanBillingInterval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  ANNUAL: 12,
}

/** Desconto sobre o valor cheio do período (soma das mensalidades base). */
export const PLAN_BILLING_INTERVAL_DISCOUNT_PERCENT: Record<PlanBillingInterval, number> = {
  MONTHLY: 0,
  QUARTERLY: 10,
  ANNUAL: 30,
}

export type PlatformPlanBillingQuote = {
  monthlyBase: number
  months: number
  subtotal: number
  discountPercent: number
  total: number
  perMonthEffective: number
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function isPlanBillingInterval(value: string): value is PlanBillingInterval {
  return (PLAN_BILLING_INTERVALS as readonly string[]).includes(value)
}

export function getPlatformPlanBillingQuote(
  plan: PlanType,
  interval: PlanBillingInterval = 'MONTHLY',
  currency: PlanPriceCurrency = 'BRL'
): PlatformPlanBillingQuote {
  const monthlyBase = planPricesForCurrency(currency)[plan] ?? 0
  const months = PLAN_BILLING_INTERVAL_MONTHS[interval]
  const subtotal = roundMoney(monthlyBase * months)
  const discountPercent = PLAN_BILLING_INTERVAL_DISCOUNT_PERCENT[interval]
  const total = roundMoney(subtotal * (1 - discountPercent / 100))
  const perMonthEffective = months > 0 ? roundMoney(total / months) : 0

  return {
    monthlyBase,
    months,
    subtotal,
    discountPercent,
    total,
    perMonthEffective,
  }
}

export function addPlanBillingPeriod(from: Date, interval: PlanBillingInterval): Date {
  const result = new Date(from)
  result.setMonth(result.getMonth() + PLAN_BILLING_INTERVAL_MONTHS[interval])
  return result
}

export function formatMoneyBrl(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

export function formatMoneyUsd(value: number): string {
  return `US$ ${value.toFixed(2).replace('.', ',')}`
}

export function formatMoneyByCurrency(
  value: number,
  currency: PlanPriceCurrency
): string {
  return currency === 'USD' ? formatMoneyUsd(value) : formatMoneyBrl(value)
}

/** Valor exibido no card: mensal base (mensal) ou equivalente mensal com desconto (trimestral/anual). */
export function getPlanCardMonthlyPriceLabel(
  plan: PlanType,
  interval: PlanBillingInterval = 'MONTHLY',
  currency: PlanPriceCurrency = 'BRL'
): string {
  if (plan === 'FREE') {
    return currency === 'USD' ? 'US$ 0,00' : 'R$ 0,00'
  }

  const quote = getPlatformPlanBillingQuote(plan, interval, currency)
  const amount =
    interval === 'MONTHLY' ? quote.monthlyBase : quote.perMonthEffective
  return formatMoneyByCurrency(amount, currency)
}

export function getPlanBillingDiscountPercent(
  interval: PlanBillingInterval
): number {
  return PLAN_BILLING_INTERVAL_DISCOUNT_PERCENT[interval]
}

export function formatPlatformPlanPriceBrl(
  plan: PlanType,
  interval: PlanBillingInterval = 'MONTHLY'
): string {
  return getPlanCardMonthlyPriceLabel(plan, interval, 'BRL')
}

export function formatPlatformPlanPriceUsd(
  plan: PlanType,
  interval: PlanBillingInterval = 'MONTHLY'
): string {
  return getPlanCardMonthlyPriceLabel(plan, interval, 'USD')
}

/** Total cobrado no período (trimestral/anual), para exibição no card. */
export function formatPlanPeriodTotalBrl(
  plan: PlanType,
  interval: PlanBillingInterval
): string {
  return formatMoneyBrl(getPlatformPlanBillingQuote(plan, interval, 'BRL').total)
}

export function formatPlanPeriodTotalUsd(
  plan: PlanType,
  interval: PlanBillingInterval
): string {
  return formatMoneyUsd(getPlatformPlanBillingQuote(plan, interval, 'USD').total)
}
