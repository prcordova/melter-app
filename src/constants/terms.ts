// Versão atual dos Termos de Uso e Política de Privacidade
// Manter em sync com melter/constants/terms.ts
// Formato: YYYY-MM-DD
export const CURRENT_TERMS_VERSION = '2026-11-09'

export const TERMS_LAST_UPDATED = new Date('2026-11-09')

/** Texto exibido em "Última atualização" — manter igual à versão. */
export const TERMS_LAST_UPDATED_LABEL = '9 de novembro de 2026'

/** Versões em formato YYYY-MM-DD: só pede novo aceite quando a versão do usuário é anterior à atual. */
export function isTermsVersionCurrent(version: string | null | undefined): boolean {
  return Boolean(version) && String(version) >= CURRENT_TERMS_VERSION
}
