/**
 * Caminhos canônicos da API de usuários (app).
 * Manter em sync com melter/src/config/users/api-paths.ts.
 * Documentação: melter/src/config/users/users.md
 */
export const USERS_API = {
  list: '/api/users',
  searchMentions: '/api/users/search-mentions',

  byUsername: (username: string) =>
    `/api/users/${encodeURIComponent(username)}`,

  social: {
    follow: (username: string) =>
      `/api/users/${encodeURIComponent(username)}/follow`,
    unfollow: (username: string) =>
      `/api/users/${encodeURIComponent(username)}/unfollow`,
    followStatus: (username: string) =>
      `/api/users/${encodeURIComponent(username)}/follow-status`,
    followers: (username: string) =>
      `/api/users/${encodeURIComponent(username)}/followers`,
    following: (username: string) =>
      `/api/users/${encodeURIComponent(username)}/following`,
  },

  me: {
    heartbeat: '/api/users/me/heartbeat',
    profile: '/api/users/profile',
    completionStatus: '/api/users/profile/completion-status',
    status: '/api/users/status',
    avatar: '/api/users/avatar',
    background: '/api/users/background',
    myPurchases: '/api/users/my-purchases',
    checkPlan: '/api/users/check-plan',
    upgradePlan: '/api/users/upgrade-plan',
    acceptTerms: '/api/users/accept-terms',
    pushToken: '/api/users/push-token',
    changePassword: '/api/users/change-password',
    setPassword: '/api/users/set-password',
    deletionStatus: '/api/users/deletion-status',
    deleteAccount: '/api/users/delete-account',
    cancelDeletion: '/api/users/cancel-deletion',
    onboardingSeller: '/api/users/onboarding-seller',
    onboardingDiscoveryTrack: '/api/users/onboarding-discovery/track',
    onboardingFollowSuggestions: '/api/users/onboarding-follow-suggestions',
    onboardingFollowSuggestionsList: '/api/users/me/onboarding-follow-suggestions',
    twoFa: {
      setup: '/api/users/2fa/setup',
      verify: '/api/users/2fa/verify',
    },
    verification: {
      submit: '/api/users/verification/submit',
    },
    username: {
      changeStatus: '/api/users/username/change-status',
      availability: '/api/users/username/availability',
      sendCode: '/api/users/username/send-code',
      update: '/api/users/username',
    },
    preferences: {
      language: '/api/users/preferences/language',
      gender: '/api/users/preferences/gender',
      demographics: '/api/users/preferences/demographics',
      transactionalEmails: '/api/users/preferences/transactional-emails',
      emailMarketing: '/api/users/preferences/email-marketing',
      categoryPreferences: '/api/users/preferences/category-preferences',
      location: '/api/users/preferences/location',
      /** Preferências de exibição dos badges (verificado + Melter) — um PATCH. */
      badges: '/api/users/preferences/badges',
    },
  },

  internal: {
    verifyPlans: '/api/users/verify-plans',
  },
} as const
