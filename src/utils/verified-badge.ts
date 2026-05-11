/**
 * Selo “verificado” ao lado do nome (estilo Meta) — NÃO é e-mail verificado.
 *
 * - **emailVerified** (conta): confirmação de e-mail / conta ativa no fluxo de cadastro.
 * - **verifiedBadge.isVerified** (selo): conta com selo após fluxo de confiança (documentos,
 *   plano elegível, aprovação admin etc.). A API expõe `verifiedBadge.source`: `plan` | `manual` | `partner`.
 *
 * A UI do app deve espelhar o web: só exibir o ícone quando `verifiedBadge.isVerified === true`.
 */
export function shouldShowVerifiedBadgeOnProfile(publicUser: {
  verifiedBadge?: { isVerified?: boolean | null };
} | null | undefined): boolean {
  if (!publicUser) return false;
  return publicUser.verifiedBadge?.isVerified === true;
}
