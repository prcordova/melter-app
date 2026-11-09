import { findExplicitTermsInBio } from './detect-explicit-text'
import { escapeRegExp } from './text-normalize'

export type ExplicitTextSpan = {
  start: number
  end: number
  term: string
}

export type ExplicitTextSegment = {
  text: string
  isExplicit: boolean
}

function mergeExplicitSpans(spans: ExplicitTextSpan[]): ExplicitTextSpan[] {
  if (spans.length === 0) return []
  const sorted = [...spans].sort((a, b) => a.start - b.start)
  const merged: ExplicitTextSpan[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]
    const last = merged[merged.length - 1]
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end)
      if (cur.term.length > last.term.length) last.term = cur.term
    } else {
      merged.push({ ...cur })
    }
  }

  return merged
}

/** Posições no texto original para sublinhar termos que disparam moderação +18. */
export function findExplicitHighlightSpans(text: string): ExplicitTextSpan[] {
  if (!text.trim()) return []

  const spans: ExplicitTextSpan[] = []
  const termsOnFullText = [...new Set(findExplicitTermsInBio(text))]
  const multiWordTerms = termsOnFullText.filter((t) => t.includes(' '))
  const singleWordTerms = new Set(
    termsOnFullText.filter((t) => !t.includes(' '))
  )

  for (const term of multiWordTerms) {
    const re = new RegExp(escapeRegExp(term).replace(/\s+/g, '\\s+'), 'gi')
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        term,
      })
    }
  }

  const parts = text.split(/(\s+)/)
  let offset = 0

  for (const part of parts) {
    if (!/^\s+$/.test(part) && part.length > 0) {
      const partTerms = findExplicitTermsInBio(part)
      for (const term of partTerms) {
        if (!singleWordTerms.has(term)) continue
        const re = new RegExp(`(${escapeRegExp(term)})`, 'gi')
        let match: RegExpExecArray | null
        while ((match = re.exec(part)) !== null) {
          spans.push({
            start: offset + match.index,
            end: offset + match.index + match[0].length,
            term,
          })
        }
      }
    }
    offset += part.length
  }

  return mergeExplicitSpans(spans)
}

export function segmentTextByExplicitTerms(text: string): ExplicitTextSegment[] {
  const spans = findExplicitHighlightSpans(text)
  if (spans.length === 0) return [{ text, isExplicit: false }]

  const segments: ExplicitTextSegment[] = []
  let cursor = 0

  for (const span of spans) {
    if (span.start > cursor) {
      segments.push({ text: text.slice(cursor, span.start), isExplicit: false })
    }
    segments.push({ text: text.slice(span.start, span.end), isExplicit: true })
    cursor = span.end
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isExplicit: false })
  }

  return segments
}

export function textHasExplicitTerms(text: string): boolean {
  return findExplicitTermsInBio(text).length > 0
}
