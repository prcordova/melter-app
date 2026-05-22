/**
 * Caminhos canônicos da API de loja (app).
 * Manter em sync com melter/src/config/shops/api-paths.ts.
 * Documentação: melter/src/config/shops/shops.md — analytics: analytics/analytics.md (web)
 */
import { SHOP_ANALYTICS_API } from './analytics/api-paths'

export const SHOP_API = {
  marketplace: {
    sellers: '/api/shops',
    products: '/api/shops/products',
  },
  me: {
    settings: '/api/shops/me/settings',
    onboardingContext: '/api/shops/me/onboarding-context',
    analytics: SHOP_ANALYTICS_API.me,
    likes: '/api/shops/me/likes',
    commentsModeration: '/api/shops/me/comments/moderation',
  },
  verification: {
    root: '/api/shops/verification',
    appeal: '/api/shops/verification/appeal',
    upload: '/api/shops/verification/upload',
  },
  subscriptionPlans: (username: string) =>
    `/api/subscription-plans/shop/${encodeURIComponent(username)}`,
} as const
