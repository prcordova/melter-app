/**
 * Caminhos canônicos da API de loja.
 * Manter em sync com melter/src/config/shop-api-paths.ts — única fonte de paths /api/shops.
 * Ver melter/docs/SHOP_API_MIGRATION.md
 */
export const SHOP_API = {
  marketplace: {
    sellers: '/api/shops',
    products: '/api/shops/products',
  },
  me: {
    settings: '/api/shops/me/settings',
    onboardingContext: '/api/shops/me/onboarding-context',
    analytics: '/api/shops/me/analytics',
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
