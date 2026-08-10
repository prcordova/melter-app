/**
 * Caminhos canônicos da API de autenticação (app).
 * Manter em sync com melter/src/config/auth/api-paths.ts.
 * Documentação: melter/src/config/auth/auth.md
 */
export const AUTH_API = {
  login: '/api/auth/login',
  login2fa: '/api/auth/login/2fa',
  confirmCancelDeletion: '/api/auth/login/confirm-cancel-deletion',
  register: '/api/auth/register',
  registerGoogle: '/api/auth/register/google',
  registerModerateAvatar: '/api/auth/register/moderate-avatar',
  google: '/api/auth/google',
  googleCallback: '/api/auth/google/callback',
  googleHandoff: '/api/auth/google/handoff',
  googleConfig: '/api/auth/google/config',
  googleLink: '/api/auth/google/link',
  verifyEmail: '/api/auth/verify-email',
  resendVerification: '/api/auth/resend-verification',
  forgotPassword: '/api/auth/forgot-password',
  verifyResetToken: '/api/auth/verify-reset-token',
  resetPassword: '/api/auth/reset-password',
  logout: '/api/auth/logout',
  planSession: '/api/auth/plan-session',
} as const
