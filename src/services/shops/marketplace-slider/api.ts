import { MARKETPLACE_SLIDER_API } from '../../../config/shops/marketplace-slider/api-paths'
import type {
  MarketplacePromotionConfig,
  MarketplaceSliderData,
  MyShopMarketplacePromotion,
} from '../../../config/shops/marketplace-slider/types'
import type { ShopPromotionPackageTier } from '../../../constants/marketplace-slider'
import type { ApiResponse } from '../../shared/types'
import { api } from '../../http-client'

export type { ShopPromotionPackageTier }

export const marketplaceSliderApi = {
  getSlider: async (showAdultContent = true) => {
    const response = await api.get<ApiResponse<MarketplaceSliderData>>(
      `${MARKETPLACE_SLIDER_API.slider}?showAdultContent=${showAdultContent}`
    )
    return response.data
  },

  getPromotionConfig: async () => {
    const response = await api.get<ApiResponse<MarketplacePromotionConfig>>(
      MARKETPLACE_SLIDER_API.promotionConfig
    )
    return response.data
  },

  createPromotion: async (input: {
    productId: string
    packageTier: ShopPromotionPackageTier
    startMode?: 'immediate' | 'scheduled'
    scheduledStartAt?: string
    promotionCoverUrl?: string | null
  }) => {
    const response = await api.post<ApiResponse<unknown>>(
      MARKETPLACE_SLIDER_API.promotions,
      input
    )
    return response.data
  },

  listMine: async () => {
    const response = await api.get<ApiResponse<MyShopMarketplacePromotion[]>>(
      MARKETPLACE_SLIDER_API.promotionsMine
    )
    return response.data
  },

  extendPromotion: async (id: string, packageTier: ShopPromotionPackageTier) => {
    const response = await api.post<ApiResponse<unknown>>(
      MARKETPLACE_SLIDER_API.promotionExtend(id),
      { packageTier }
    )
    return response.data
  },

  cancelPromotion: async (id: string) => {
    const response = await api.post<ApiResponse<unknown>>(
      MARKETPLACE_SLIDER_API.promotionCancel(id),
      {}
    )
    return response.data
  },

  recordClick: async (id: string) => {
    const response = await api.post<ApiResponse<unknown>>(
      MARKETPLACE_SLIDER_API.promotionClick(id),
      {}
    )
    return response.data
  },
}
