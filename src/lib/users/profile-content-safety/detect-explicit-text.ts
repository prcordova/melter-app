import {
  LONG_EXPLICIT_TERMS,
  SHORT_EXPLICIT_TERMS,
} from './explicit-terms'
import {
  collapseRepeatedLetters,
  escapeRegExp,
  normalizeTextForExplicitMatch,
} from './text-normalize'

export type ExplicitTextDetection = {
  bio: boolean
  username: boolean
  /** Mensagem de status do perfil (`status.customMessage`). */
  status: boolean
  /** Títulos de links visíveis no perfil. */
  links: boolean
  /** Texto dos últimos posts públicos exibidos na prévia do perfil. */
  posts: boolean
}

/** Texto corrido (bio, post, título de link, status). */
export function textContainsExplicitContent(text: string): boolean {
  return findExplicitTermsInBio(text).length > 0
}

export function detectExplicitInTextList(texts: Array<string | null | undefined>): boolean {
  for (const raw of texts) {
    const t = (raw ?? '').trim()
    if (t && textContainsExplicitContent(t)) return true
  }
  return false
}

function normalizedBioTokens(bio: string): string {
  return collapseRepeatedLetters(normalizeTextForExplicitMatch(bio))
}

/** Termo como palavra inteira em texto corrido (bio). */
function bioContainsTerm(normalizedBio: string, term: string): boolean {
  const pattern = new RegExp(
    `(?:^|[^a-z0-9])${escapeRegExp(term)}(?:[^a-z0-9]|$)`,
    'i'
  )
  return pattern.test(normalizedBio)
}

function usernameSegments(username: string): string[] {
  const normalized = collapseRepeatedLetters(
    normalizeTextForExplicitMatch(username.replace(/^@+/, ''))
  )
  return normalized.split(/[^a-z0-9]+/).filter(Boolean)
}

/** Evita falso positivo (ex.: "paulo" ≠ "pau", "enrolar" ≠ "rola"). */
function segmentMatchesTerm(seg: string, term: string): boolean {
  if (seg === term) return true
  if (term.length < 4) return false
  if (seg.startsWith(term) || seg.endsWith(term)) {
    return seg.length <= term.length + 4
  }
  return false
}

function usernameContainsTerm(normalizedUsername: string, segments: string[], term: string): boolean {
  if (segments.some((seg) => seg === term)) return true
  if (normalizedUsername === term) return true

  if (term.length <= 3) {
    return false
  }

  if (segments.some((seg) => segmentMatchesTerm(seg, term))) {
    return true
  }

  const boundary = new RegExp(
    `(?:^|[^a-z0-9])${escapeRegExp(term)}(?:[^a-z0-9]|$)`
  )
  return boundary.test(normalizedUsername)
}

export function findExplicitTermsInBio(bio: string): string[] {
  if (!bio.trim()) return []
  const normalized = normalizedBioTokens(bio)
  const found: string[] = []
  for (const term of LONG_EXPLICIT_TERMS) {
    if (bioContainsTerm(normalized, term)) found.push(term)
  }
  for (const term of SHORT_EXPLICIT_TERMS) {
    if (bioContainsTerm(normalized, term)) found.push(term)
  }
  return found
}

export function findExplicitTermsInUsername(username: string): string[] {
  const raw = username.trim().replace(/^@+/, '')
  if (!raw) return []
  const normalized = collapseRepeatedLetters(normalizeTextForExplicitMatch(raw))
  const segments = usernameSegments(raw)
  const found: string[] = []
  for (const term of [...LONG_EXPLICIT_TERMS, ...SHORT_EXPLICIT_TERMS]) {
    if (usernameContainsTerm(normalized, segments, term)) found.push(term)
  }
  return found
}

/** Mesmas regras de palavra inteira da bio (texto corrido curto). */
export function findExplicitTermsInStatusMessage(message: string): string[] {
  return findExplicitTermsInBio(message)
}

export function detectExplicitText(
  bio: string | null | undefined,
  username: string | null | undefined,
  statusMessage?: string | null | undefined,
  surface?: {
    linkTitles?: Array<string | null | undefined>
    postContents?: Array<string | null | undefined>
  }
): ExplicitTextDetection {
  const bioText = (bio ?? '').trim()
  const userText = (username ?? '').trim()
  const statusText = (statusMessage ?? '').trim()
  return {
    bio: bioText.length > 0 && findExplicitTermsInBio(bioText).length > 0,
    username: userText.length > 0 && findExplicitTermsInUsername(userText).length > 0,
    status: statusText.length > 0 && findExplicitTermsInStatusMessage(statusText).length > 0,
    links: detectExplicitInTextList(surface?.linkTitles ?? []),
    posts: detectExplicitInTextList(surface?.postContents ?? []),
  }
}
