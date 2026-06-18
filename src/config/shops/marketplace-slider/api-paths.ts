/**
 * Paths da API do slider promovido no marketplace (app).
 * Manter em sync com melter/src/config/shops/marketplace-slider/api-paths.ts
 */
export const MARKETPLACE_SLIDER_API = {
  slider: '/api/shops/marketplace/slider',
  promotionConfig: '/api/shops/marketplace/promotion-config',
  promotions: '/api/shops/marketplace/promotions',
  promotionsMine: '/api/shops/marketplace/promotions/mine',
  promotion: (id: string) => `/api/shops/marketplace/promotions/${encodeURIComponent(id)}`,
  promotionExtend: (id: string) =>
    `/api/shops/marketplace/promotions/${encodeURIComponent(id)}/extend`,
  promotionCancel: (id: string) =>
    `/api/shops/marketplace/promotions/${encodeURIComponent(id)}/cancel`,
  promotionClick: (id: string) =>
    `/api/shops/marketplace/promotions/${encodeURIComponent(id)}/click`,
  adminConfig: '/api/admin/ads/marketplace-slider-config',
} as const
