/**
 * Caminhos canônicos da API de loja (app).
 * Manter em sync com melter/src/config/shops/api-paths.ts.
 * Documentação: melter/src/config/shops/shops.md — analytics: analytics/analytics.md (web)
 */
import { SHOP_ANALYTICS_API } from './analytics/api-paths'
import { MARKETPLACE_SLIDER_API } from './marketplace-slider/api-paths'

export const SHOP_API = {
  marketplace: {
    sellers: '/api/shops',
    products: '/api/shops/products',
    ...MARKETPLACE_SLIDER_API,
  },
  me: {
    settings: '/api/shops/me/settings',
    background: '/api/shops/me/background',
    onboardingContext: '/api/shops/me/onboarding-context',
    analytics: SHOP_ANALYTICS_API.me,
    likes: '/api/shops/me/likes',
    commentsModeration: '/api/shops/me/comments/moderation',
    planAbandonFeedback: '/api/shops/me/plan-abandon-feedback',
  },
  verification: {
    root: '/api/shops/verification',
    appeal: '/api/shops/verification/appeal',
    upload: '/api/shops/verification/upload',
  },
  subscriptionPlans: (username: string) =>
    `/api/subscription-plans/shop/${encodeURIComponent(username)}`,
} as const

/** Vídeo de apresentação do pacote — sync com melter web */
export const PRESENTATION_VIDEO_API = {
  upload: '/api/products/upload/presentation-video',
  product: (productId: string) =>
    `/api/products/${encodeURIComponent(productId)}/presentation-video`,
  adminList: '/api/admin/marketplace/presentation-videos',
  adminItem: (productId: string) =>
    `/api/admin/marketplace/presentation-videos/${encodeURIComponent(productId)}`,
} as const
