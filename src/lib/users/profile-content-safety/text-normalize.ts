/**
 * Espelho de `melter/src/lib/users/profile-content-safety/text-normalize.ts`.
 * Diacríticos via intervalo explícito (Hermes sem garantia de `\p{M}`).
 */

/** Remove acentos e normaliza para comparação de termos explícitos. */
export function normalizeTextForExplicitMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[5]/g, 's')
    .replace(/\$/g, 's')
}

/** Colapsa letras repetidas (ex.: gooozar → gozar) para leetspeak leve. */
export function collapseRepeatedLetters(normalized: string): string {
  return normalized.replace(/(.)\1{2,}/g, '$1$1')
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
