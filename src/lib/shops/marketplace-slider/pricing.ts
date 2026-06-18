import { FIXED_CATEGORIES } from '../../../constants/categories'
import {
  DEFAULT_MARKETPLACE_SLIDER_CONFIG,
  type ShopPromotionPackageTier,
} from '../../../constants/marketplace-slider'

export type MarketplaceSliderPricingConfig = {
  costPerDay: number
  costPerWeek: number
  costPerMonth: number
  categoryMultipliers: Record<string, number>
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
