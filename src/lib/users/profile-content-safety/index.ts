/**
 * Detecção de termos +18 no cliente — espelho de `melter/src/lib/users/profile-content-safety`
 * (o servidor continua sendo a validação final em POST /api/posts).
 */
import { stripRichTextMarkup } from '../../rich-text';
import { textContainsExplicitContent } from './detect-explicit-text';

export { textHasExplicitTerms, segmentTextByExplicitTerms } from './explicit-text-spans';
export type { ExplicitTextSegment } from './explicit-text-spans';

export const ADULT_POST_CATEGORY_ID = 'conteudo-18';

/** Mesma regra do web `assertPublicPostContentAllowed`. */
export function isPublicPostContentAllowed(
  content: string,
  visibility: string | null | undefined,
  category?: string | null
): boolean {
  if ((visibility ?? 'PUBLIC').toUpperCase() !== 'PUBLIC') return true;
  if (String(category ?? '') === ADULT_POST_CATEGORY_ID) return true;
  const text = stripRichTextMarkup(content ?? '').trim();
  return !text || !textContainsExplicitContent(text);
}
