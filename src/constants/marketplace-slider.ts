export const SHOP_PROMOTION_PACKAGE_TIERS = ['day', 'week', 'month'] as const

export type ShopPromotionPackageTier = (typeof SHOP_PROMOTION_PACKAGE_TIERS)[number]

export const SHOP_PROMOTION_STATUSES = [
  'SCHEDULED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const

export type ShopPromotionStatus = (typeof SHOP_PROMOTION_STATUSES)[number]

export const MARKETPLACE_SLIDER_AUTO_SCROLL_MS = 6000

export const MARKETPLACE_SLIDER_HEIGHT = 148

export const DEFAULT_MARKETPLACE_SLIDER_CONFIG = {
  costPerDay: 10,
  costPerWeek: 50,
  costPerMonth: 150,
  placeholderEnabled: true,
  placeholderImageUrl: null as string | null,
  placeholderShowText: true,
}
