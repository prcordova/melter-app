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

/** Recuo dos CTAs dentro do slide (Ver mais / Saiba mais). */
export const MARKETPLACE_SLIDER_ACTION_INSET = {
  compact: 10,
  regular: 12,
} as const

export const PACKAGE_TIER_CALENDAR_DAYS = {
  day: 1,
  week: 7,
  month: 30,
} as const satisfies Record<ShopPromotionPackageTier, number>

export const DEFAULT_MARKETPLACE_SLIDER_CONFIG = {
  costPerDay: 10,
  costPerWeek: 50,
  costPerMonth: 150,
  placeholderEnabled: true,
  placeholderImageUrl: null as string | null,
  placeholderShowText: true,
}
