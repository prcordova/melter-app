/**
 * Selo ao lado do nome no perfil / feed:
 * - `verifiedBadge.isVerified`: selo oficial (manual, parceiro, ou sincronizado com a API).
 * - Plano PRO+ ativo: mesmo critério comercial do catálogo (plano mais alto com direito a selo no app).
 */
export function shouldShowVerifiedBadgeOnProfile(publicUser: {
  verifiedBadge?: { isVerified?: boolean | null };
  plan?: { type?: string; status?: string | null };
} | null | undefined): boolean {
  if (!publicUser) return false;
  if (publicUser.verifiedBadge?.isVerified === true) return true;
  const t = publicUser.plan?.type;
  const st = publicUser.plan?.status;
  if (t !== 'PRO_PLUS') return false;
  if (st === 'INACTIVE' || st === 'EXPIRED' || st === 'CANCELLED') return false;
  return st === 'ACTIVE' || st === undefined || st === null;
}
