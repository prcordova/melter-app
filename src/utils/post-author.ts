import type { PostUser } from '../types/feed';

/** Cor do selo verificado no feed — alinhada ao web (`CustomVerifiedBadge`). */
export const VERIFIED_BADGE_ICON_COLOR = 'rgba(236, 72, 153, 0.9)';

export function getPostAuthorObjectId(
  author: PostUser | Record<string, unknown> | null | undefined
): string | null {
  if (!author || typeof author !== 'object') return null;
  const raw = (author as Record<string, unknown>)._id ?? (author as Record<string, unknown>).id;
  if (raw == null || raw === '') return null;
  return String(raw);
}

/** Texto ao lado do avatar: @username preferencialmente; fallback para nome completo. */
export function getPostAuthorDisplayLabel(
  author: PostUser | Record<string, unknown> | null | undefined
): string {
  if (!author || typeof author !== 'object') return 'Usuário';
  const u = (author as PostUser).username;
  if (typeof u === 'string' && u.trim()) return u.trim();
  const fn = (author as { fullName?: string }).fullName;
  if (typeof fn === 'string' && fn.trim()) return fn.trim();
  return 'Usuário';
}

/** Só navega para perfil quando há username (rota é por @). */
export function getPostAuthorUsernameForNav(
  author: PostUser | Record<string, unknown> | null | undefined
): string | null {
  if (!author || typeof author !== 'object') return null;
  const u = (author as PostUser).username;
  if (typeof u === 'string' && u.trim()) return u.trim();
  return null;
}
