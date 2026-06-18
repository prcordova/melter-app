import type { ShopPromotionPackageTier, ShopPromotionStatus } from '../../../constants/marketplace-slider'

export type MarketplaceSliderItem = {
  _id: string
  promotionId: string
  productId: string
  title: string
  username: string
  avatar: string | null
  shopUrl: string
  coverUrl: string | null
  isAdultContent: boolean
  isAiContent: boolean
  viewsCount: number
}

export type MarketplaceSliderData = {
  items: MarketplaceSliderItem[]
  placeholderEnabled: boolean
  autoScrollMs: number
  placeholderImageUrl?: string | null
  placeholderShowText?: boolean
}

export type MarketplacePromotionPackage = {
  tier: ShopPromotionPackageTier
  calendarDays: number
  baseCost: number
}

export type MarketplacePromotionConfig = {
  packages: MarketplacePromotionPackage[]
  categoryMultipliers: Array<{
    categoryId: string
    name: string
    multiplier: number
  }>
  sliderOrderMode?: string
  placeholderEnabled?: boolean
}

export type MyShopMarketplacePromotion = {
  _id: string
  productId: string
  productTitle: string
  status: ShopPromotionStatus
  packageTier: ShopPromotionPackageTier
  startDate: string
  endDate: string
  totalCost: number
  viewsCount: number
  clicksCount: number
  coverUrl: string | null
  cancelledAt: string | null
  createdAt: string
}
