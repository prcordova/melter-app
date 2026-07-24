/**
 * Markup leve de rich text — espelho de `melter/src/lib/rich-text` (leitura no app).
 * Sem conversão HTML/DOM (só tokenização + strip).
 */

export const RICH_TEXT_COLORS = [
  { id: 'default', label: 'Padrão', value: '' },
  { id: 'pink', label: 'Rosa', value: '#ec4899' },
  { id: 'red', label: 'Vermelho', value: '#ef4444' },
  { id: 'orange', label: 'Laranja', value: '#f97316' },
  { id: 'amber', label: 'Âmbar', value: '#f59e0b' },
  { id: 'green', label: 'Verde', value: '#22c55e' },
  { id: 'blue', label: 'Azul', value: '#3b82f6' },
  { id: 'violet', label: 'Violeta', value: '#8b5cf6' },
  { id: 'gray', label: 'Cinza', value: '#6b7280' },
  { id: 'black', label: 'Preto', value: '#111827' },
] as const

export const RICH_TEXT_BG_COLORS = [
  { id: 'none', label: 'Nenhum', value: '' },
  { id: 'yellow', label: 'Amarelo', value: '#fef08a' },
  { id: 'pink', label: 'Rosa', value: '#fbcfe8' },
  { id: 'green', label: 'Verde', value: '#bbf7d0' },
  { id: 'blue', label: 'Azul', value: '#bfdbfe' },
  { id: 'orange', label: 'Laranja', value: '#fed7aa' },
  { id: 'violet', label: 'Violeta', value: '#ddd6fe' },
  { id: 'gray', label: 'Cinza', value: '#e5e7eb' },
] as const

/** @deprecated use RICH_TEXT_COLORS */
export const POST_TEXT_COLORS = RICH_TEXT_COLORS
/** @deprecated use RICH_TEXT_BG_COLORS */
export const POST_BG_COLORS = RICH_TEXT_BG_COLORS

export type RichTextFormattingMeta = {
  hasBold: boolean
  hasItalic: boolean
  hasTextColor: boolean
  hasBackground: boolean
  hasBullets: boolean
}

/** @deprecated use RichTextFormattingMeta */
export type PostFormattingMeta = RichTextFormattingMeta

export function getRichTextFormattingMeta(content: string): RichTextFormattingMeta {
  const text = content || ''
  return {
    hasBold: /\*\*[^*\n]+\*\*/.test(text),
    hasItalic: /(?<!\*)\*[^*\n]+\*(?!\*)/.test(text),
    hasTextColor: /\{\{\s*fg\s*:\s*#[0-9a-fA-F]{3,8}\s*\}\}/i.test(text),
    hasBackground: /\{\{\s*bg\s*:\s*#[0-9a-fA-F]{3,8}\s*\}\}/i.test(text),
    hasBullets: /(^|\n)\s*([•\-])\s+\S/m.test(text) || /(^|\n)\s*\d+\.\s+\S/m.test(text),
  }
}

/** @deprecated use getRichTextFormattingMeta */
export const getPostFormattingMeta = getRichTextFormattingMeta

/** True se o conteúdo usa negrito, itálico, cores, fundo ou bullets formatados. */
export function contentUsesRichTextCustomization(content: string): boolean {
  const meta = getRichTextFormattingMeta(content)
  return (
    meta.hasBold ||
    meta.hasItalic ||
    meta.hasTextColor ||
    meta.hasBackground ||
    meta.hasBullets
  )
}

/** Remove markup para busca, hashtags e checagens de segurança. */
export function stripRichTextMarkup(text: string): string {
  let out = text || ''
  // Repete para aninhamentos {{fg}}{{bg}}…{{/bg}}{{/fg}}
  for (let n = 0; n < 8; n += 1) {
    const next = out
      .replace(/\{\{\s*fg\s*:\s*#[0-9a-fA-F]{3,8}\s*\}\}/gi, '')
      .replace(/\{\{\s*\/\s*fg\s*\}\}/gi, '')
      .replace(/\{\{\s*bg\s*:\s*#[0-9a-fA-F]{3,8}\s*\}\}/gi, '')
      .replace(/\{\{\s*\/\s*bg\s*\}\}/gi, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    if (next === out) break
    out = next
  }
  return out
}

/** @deprecated use stripRichTextMarkup */
export const stripPostRichMarkup = stripRichTextMarkup

export function wrapSelectionWithMarkup(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  open: string,
  close: string
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = Math.max(0, Math.min(selectionStart, selectionEnd))
  const end = Math.max(selectionStart, selectionEnd)
  const selected = value.slice(start, end) || 'texto'
  const next = `${value.slice(0, start)}${open}${selected}${close}${value.slice(end)}`
  const innerStart = start + open.length
  return {
    value: next,
    selectionStart: innerStart,
    selectionEnd: innerStart + selected.length,
  }
}

export function wrapSelectionBold(value: string, start: number, end: number) {
  return wrapSelectionWithMarkup(value, start, end, '**', '**')
}

export function wrapSelectionItalic(value: string, start: number, end: number) {
  return wrapSelectionWithMarkup(value, start, end, '*', '*')
}

export function wrapSelectionFgColor(
  value: string,
  start: number,
  end: number,
  hex: string
) {
  if (!hex) return { value, selectionStart: start, selectionEnd: end }
  return wrapSelectionWithMarkup(value, start, end, `{{fg:${hex}}}`, '{{/fg}}')
}

export function wrapSelectionBgColor(
  value: string,
  start: number,
  end: number,
  hex: string
) {
  if (!hex) return { value, selectionStart: start, selectionEnd: end }
  return wrapSelectionWithMarkup(value, start, end, `{{bg:${hex}}}`, '{{/bg}}')
}

/** Insere "- " no início da linha do cursor (bullet) — útil em textarea puro. */
export function insertBulletAtCursor(
  value: string,
  cursor: number
): { value: string; selectionStart: number; selectionEnd: number } {
  const before = value.slice(0, cursor)
  const lineStart = before.lastIndexOf('\n') + 1
  const line = value.slice(lineStart).split('\n')[0] ?? ''
  if (/^\s*([•\-])\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
    return { value, selectionStart: cursor, selectionEnd: cursor }
  }
  const next = `${value.slice(0, lineStart)}- ${value.slice(lineStart)}`
  const pos = cursor + 2
  return { value: next, selectionStart: pos, selectionEnd: pos }
}

/**
 * Ao pressionar Enter em textarea: continua bullet da linha anterior,
 * ou remove bullet vazio.
 */
export function handleRichTextEditorEnter(
  value: string,
  selectionStart: number
): { value: string; selectionStart: number; selectionEnd: number } | null {
  const before = value.slice(0, selectionStart)
  const after = value.slice(selectionStart)
  const lineStart = before.lastIndexOf('\n') + 1
  const currentLine = before.slice(lineStart)

  const bulletMatch = currentLine.match(/^(\s*)([•\-])\s(.*)$/)
  const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/)

  if (bulletMatch) {
    const [, indent, mark, rest] = bulletMatch
    if (!rest.trim()) {
      const next = `${value.slice(0, lineStart)}${after}`
      return {
        value: next,
        selectionStart: lineStart,
        selectionEnd: lineStart,
      }
    }
    const insert = `\n${indent}${mark} `
    const next = `${before}${insert}${after}`
    const pos = before.length + insert.length
    return { value: next, selectionStart: pos, selectionEnd: pos }
  }

  if (numberedMatch) {
    const [, indent, num, rest] = numberedMatch
    if (!rest.trim()) {
      const next = `${value.slice(0, lineStart)}${after}`
      return {
        value: next,
        selectionStart: lineStart,
        selectionEnd: lineStart,
      }
    }
    const nextNum = Number(num) + 1
    const insert = `\n${indent}${nextNum}. `
    const next = `${before}${insert}${after}`
    const pos = before.length + insert.length
    return { value: next, selectionStart: pos, selectionEnd: pos }
  }

  return null
}

/** @deprecated use handleRichTextEditorEnter */
export const handlePostEditorEnter = handleRichTextEditorEnter

export type RichInlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: RichInlineToken[] }
  | { type: 'italic'; children: RichInlineToken[] }
  | { type: 'fg'; color: string; children: RichInlineToken[] }
  | { type: 'bg'; color: string; children: RichInlineToken[] }

const OPEN_COLOR_RE = /^\{\{\s*(fg|bg)\s*:\s*(#[0-9a-fA-F]{3,8})\s*\}\}/i

function findMatchingCloseTag(text: string, from: number, kind: 'fg' | 'bg'): number {
  const openFullRe = new RegExp(`^\\{\\{\\s*${kind}\\s*:\\s*#[0-9a-fA-F]{3,8}\\s*\\}\\}`, 'i')
  const closeRe = new RegExp(`^\\{\\{\\s*/\\s*${kind}\\s*\\}\\}`, 'i')
  let depth = 1
  let i = from

  while (i < text.length) {
    if (text[i] !== '{') {
      i += 1
      continue
    }
    const slice = text.slice(i)
    const openMatch = slice.match(openFullRe)
    if (openMatch) {
      depth += 1
      i += openMatch[0].length
      continue
    }
    const closeMatch = slice.match(closeRe)
    if (closeMatch) {
      depth -= 1
      if (depth === 0) return i
      i += closeMatch[0].length
      continue
    }
    i += 1
  }
  return -1
}

function findClosingEmphasis(text: string, from: number, marker: '**' | '*'): number {
  let i = from
  while (i < text.length) {
    if (marker === '**') {
      if (text.startsWith('**', i)) return i
      i += 1
      continue
    }
    if (text[i] === '*' && text[i + 1] !== '*') return i
    i += 1
  }
  return -1
}

function pushText(tokens: RichInlineToken[], text: string) {
  if (!text) return
  const last = tokens[tokens.length - 1]
  if (last?.type === 'text') {
    last.text += text
    return
  }
  tokens.push({ type: 'text', text })
}

/**
 * Tokeniza inline com aninhamento real:
 * fundo+cor, negrito/itálico dentro de cores, cores dentro de ênfase, etc.
 */
export function tokenizeRichInlineNested(line: string): RichInlineToken[] {
  if (!line) return [{ type: 'text', text: '' }]

  const tokens: RichInlineToken[] = []
  let i = 0

  while (i < line.length) {
    const rest = line.slice(i)

    const colorOpen = rest.match(OPEN_COLOR_RE)
    if (colorOpen) {
      const kind = colorOpen[1].toLowerCase() as 'fg' | 'bg'
      const color = colorOpen[2]
      const contentStart = i + colorOpen[0].length
      const closeAt = findMatchingCloseTag(line, contentStart, kind)
      if (closeAt < 0) {
        pushText(tokens, colorOpen[0])
        i = contentStart
        continue
      }
      const closeMatch = line.slice(closeAt).match(new RegExp(`^\\{\\{\\s*/\\s*${kind}\\s*\\}\\}`, 'i'))
      tokens.push({
        type: kind,
        color,
        children: tokenizeRichInlineNested(line.slice(contentStart, closeAt)),
      })
      i = closeAt + (closeMatch?.[0].length ?? 0)
      continue
    }

    if (rest.startsWith('**')) {
      const closeAt = findClosingEmphasis(line, i + 2, '**')
      if (closeAt < 0) {
        pushText(tokens, '*')
        i += 1
        continue
      }
      tokens.push({
        type: 'bold',
        children: tokenizeRichInlineNested(line.slice(i + 2, closeAt)),
      })
      i = closeAt + 2
      continue
    }

    if (rest[0] === '*' && rest[1] !== '*') {
      const closeAt = findClosingEmphasis(line, i + 1, '*')
      if (closeAt < 0) {
        pushText(tokens, '*')
        i += 1
        continue
      }
      tokens.push({
        type: 'italic',
        children: tokenizeRichInlineNested(line.slice(i + 1, closeAt)),
      })
      i = closeAt + 1
      continue
    }

    let cut = rest.length
    const nextColor = rest.search(/\{\{\s*(?:fg|bg)\s*:/i)
    if (nextColor >= 0) cut = Math.min(cut, nextColor)
    const nextBold = rest.indexOf('**')
    if (nextBold >= 0) cut = Math.min(cut, nextBold)
    for (let j = 0; j < cut; j += 1) {
      if (rest[j] === '*' && rest[j + 1] !== '*') {
        cut = j
        break
      }
    }

    if (cut === 0) {
      pushText(tokens, rest[0])
      i += 1
      continue
    }
    pushText(tokens, rest.slice(0, cut))
    i += cut
  }

  return tokens.length ? tokens : [{ type: 'text', text: line }]
}
