import { FIXED_CATEGORIES } from '../../../constants/categories'
import {
  DEFAULT_MARKETPLACE_SLIDER_CONFIG,
  PACKAGE_TIER_CALENDAR_DAYS,
  SHOP_PROMOTION_PACKAGE_TIERS,
  type ShopPromotionPackageTier,
} from '../../../constants/marketplace-slider'
import type { MarketplacePromotionConfig } from '../../../config/shops/marketplace-slider/types'

export type MarketplaceSliderPricingConfig = {
  costPerDay: number
  costPerWeek: number
  costPerMonth: number
  categoryMultipliers: Record<string, number>
}

export type ShopPromotionPackageOffer = {
  tier: ShopPromotionPackageTier
  calendarDays: number
  cost: number
  referenceCost: number
  savingsAmount: number
  savingsPercent: number
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function normalizeMarketplaceSliderPricing(
  raw?: Partial<MarketplaceSliderPricingConfig> | null
): MarketplaceSliderPricingConfig {
  const multipliers: Record<string, number> = {}
  for (const cat of FIXED_CATEGORIES) {
    const value = raw?.categoryMultipliers?.[cat._id]
    multipliers[cat._id] = typeof value === 'number' && value > 0 ? value : 1
  }

  return {
    costPerDay: raw?.costPerDay ?? DEFAULT_MARKETPLACE_SLIDER_CONFIG.costPerDay,
    costPerWeek: raw?.costPerWeek ?? DEFAULT_MARKETPLACE_SLIDER_CONFIG.costPerWeek,
    costPerMonth: raw?.costPerMonth ?? DEFAULT_MARKETPLACE_SLIDER_CONFIG.costPerMonth,
    categoryMultipliers: multipliers,
  }
}

function getPackageBaseCost(
  tier: ShopPromotionPackageTier,
  config: MarketplaceSliderPricingConfig
): number {
  switch (tier) {
    case 'day':
      return config.costPerDay
    case 'week':
      return config.costPerWeek
    case 'month':
      return config.costPerMonth
    default:
      return config.costPerDay
  }
}

export function calculateShopPromotionCost(
  tier: ShopPromotionPackageTier,
  categoryId: string | null | undefined,
  config: MarketplaceSliderPricingConfig
): number {
  const base = getPackageBaseCost(tier, config)
  const multiplier =
    categoryId && config.categoryMultipliers[categoryId] != null
      ? config.categoryMultipliers[categoryId]
      : 1
  return Math.round(base * multiplier * 100) / 100
}

export function listShopPromotionPackageOffers(
  categoryId: string | null | undefined,
  config: MarketplaceSliderPricingConfig
): ShopPromotionPackageOffer[] {
  const dailyCost = calculateShopPromotionCost('day', categoryId, config)

  return SHOP_PROMOTION_PACKAGE_TIERS.map((tier) => {
    const calendarDays = PACKAGE_TIER_CALENDAR_DAYS[tier]
    const cost = calculateShopPromotionCost(tier, categoryId, config)
    const referenceCost = roundMoney(dailyCost * calendarDays)
    const savingsAmount = roundMoney(Math.max(0, referenceCost - cost))
    const savingsPercent =
      referenceCost > 0 ? Math.round((savingsAmount / referenceCost) * 100) : 0

    return {
      tier,
      calendarDays,
      cost,
      referenceCost,
      savingsAmount,
      savingsPercent,
    }
  })
}

export function pricingFromPromotionConfig(
  config: MarketplacePromotionConfig
): MarketplaceSliderPricingConfig {
  const byTier = Object.fromEntries(config.packages.map((p) => [p.tier, p.baseCost])) as Record<
    ShopPromotionPackageTier,
    number
  >
  return normalizeMarketplaceSliderPricing({
    costPerDay: byTier.day,
    costPerWeek: byTier.week,
    costPerMonth: byTier.month,
    categoryMultipliers: Object.fromEntries(
      config.categoryMultipliers.map((c) => [c.categoryId, c.multiplier])
    ),
  })
}
