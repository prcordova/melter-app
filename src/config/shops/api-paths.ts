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
  /** Pacotes de outras lojas na mesma categoria — seção Relacionados na vitrine */
  relatedProducts: (username: string) =>
    `/api/shops/${encodeURIComponent(username)}/related-products`,
  me: {
    settings: '/api/shops/me/settings',
    background: '/api/shops/me/background',
    onboardingContext: '/api/shops/me/onboarding-context',
    analytics: SHOP_ANALYTICS_API.me,
    likes: '/api/shops/me/likes',
    commentsModeration: '/api/shops/me/comments/moderation',
    planAbandonFeedback: '/api/shops/me/plan-abandon-feedback',
    platformReview: '/api/shops/me/platform-review',
    platformReviewSnooze: '/api/shops/me/platform-review/snooze',
  },
  verification: {
    root: '/api/shops/verification',
    appeal: '/api/shops/verification/appeal',
    upload: '/api/shops/verification/upload',
  },
  subscriptionPlans: (username: string) =>
    `/api/subscription-plans/shop/${encodeURIComponent(username)}`,
} as const

/** Prova social pública + moderação admin — sync com melter web */
export const PLATFORM_REVIEWS_API = {
  socialProof: '/api/platform-reviews/social-proof',
  adminList: '/api/admin/platform-reviews',
  adminItem: (id: string) => `/api/admin/platform-reviews/${encodeURIComponent(id)}`,
  adminActivate: (userId: string) =>
    `/api/admin/users/${encodeURIComponent(userId)}/platform-review/activate`,
} as const

/** Admin Sistema → Lojas e produtos — sync com melter web */
export const SHOP_ADMIN_SETTINGS_API = {
  shopProducts: '/api/admin/settings/shop-products',
  releasePlanGatedMarketplace: '/api/admin/settings/shop-products/release-marketplace',
} as const

/** Pedidos de assinatura do comprador — sync com melter web */
export const SUBSCRIPTION_ORDERS_API = {
  cancel: (orderId: string) => `/api/subscriptions/orders/${encodeURIComponent(orderId)}/cancel`,
} as const

/** Acesso do comprador à mídia privada do pacote — sync com melter web */
export const PRODUCT_MEDIA_API = {
  sign: (productId: string) => `/api/products/${encodeURIComponent(productId)}/media/sign`,
  download: (productId: string) => `/api/products/${encodeURIComponent(productId)}/download`,
  progress: (productId: string) => `/api/products/${encodeURIComponent(productId)}/progress`,
  modules: (productId: string) => `/api/products/${encodeURIComponent(productId)}/modules`,
  fileViews: (productId: string, fileId: string) =>
    `/api/products/${encodeURIComponent(productId)}/files/${encodeURIComponent(fileId)}/views`,
} as const

/** Rascunhos de pacote + upload privado de arquivos — sync com melter web */
export const PRODUCT_DRAFTS_API = {
  root: '/api/products/drafts',
  item: (productId: string) => `/api/products/drafts/${encodeURIComponent(productId)}`,
  publish: (productId: string) =>
    `/api/products/drafts/${encodeURIComponent(productId)}/publish`,
  discard: (productId: string) =>
    `/api/products/drafts/${encodeURIComponent(productId)}/discard`,
  cleanupEmpty: (productId: string) =>
    `/api/products/drafts/${encodeURIComponent(productId)}/cleanup-empty`,
  uploadFiles: '/api/products/upload/files',
  uploadCover: '/api/products/upload/cover',
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
