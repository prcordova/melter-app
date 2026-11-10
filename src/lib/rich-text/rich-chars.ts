/**
 * Modelo por caractere para editor WYSIWYG no app (sem mostrar markup `{{}}` / `**`).
 * Serializa de/para o markup leve compartilhado com o web.
 */

import { tokenizeRichInlineNested, type RichInlineToken } from './index'

export type RichCharStyle = {
  bold?: boolean
  italic?: boolean
  fg?: string
  bg?: string
}

export type RichChar = RichCharStyle & { ch: string }

function styleKey(s: RichCharStyle): string {
  return `${s.bold ? 1 : 0}|${s.italic ? 1 : 0}|${s.fg || ''}|${s.bg || ''}`
}

function sameStyle(a: RichCharStyle, b: RichCharStyle): boolean {
  return styleKey(a) === styleKey(b)
}

function pickStyle(c: RichCharStyle): RichCharStyle {
  const out: RichCharStyle = {}
  if (c.bold) out.bold = true
  if (c.italic) out.italic = true
  if (c.fg) out.fg = c.fg
  if (c.bg) out.bg = c.bg
  return out
}

function tokensToChars(tokens: RichInlineToken[], style: RichCharStyle): RichChar[] {
  const out: RichChar[] = []
  for (const token of tokens) {
    if (token.type === 'text') {
      for (const ch of token.text) {
        out.push({ ch, ...style })
      }
      continue
    }
    if (token.type === 'bold') {
      out.push(...tokensToChars(token.children, { ...style, bold: true }))
      continue
    }
    if (token.type === 'italic') {
      out.push(...tokensToChars(token.children, { ...style, italic: true }))
      continue
    }
    if (token.type === 'fg') {
      out.push(...tokensToChars(token.children, { ...style, fg: token.color }))
      continue
    }
    out.push(...tokensToChars(token.children, { ...style, bg: token.color }))
  }
  return out
}

/** Markup persistido → chars editáveis (texto puro + estilos). */
export function markupToRichChars(markup: string): RichChar[] {
  const text = (markup || '').replace(/\r\n/g, '\n')
  if (!text) return []
  const lines = text.split('\n')
  const out: RichChar[] = []
  lines.forEach((line, index) => {
    if (index > 0) out.push({ ch: '\n' })
    out.push(...tokensToChars(tokenizeRichInlineNested(line), {}))
  })
  return out
}

export function richCharsToPlain(chars: RichChar[]): string {
  return chars.map((c) => c.ch).join('')
}

function emitStyled(text: string, style: RichCharStyle): string {
  if (!text) return ''
  let out = text
  if (style.italic) out = `*${out}*`
  if (style.bold) out = `**${out}**`
  if (style.fg) out = `{{fg:${style.fg}}}${out}{{/fg}}`
  if (style.bg) out = `{{bg:${style.bg}}}${out}{{/bg}}`
  return out
}

/** Chars → markup leve (mesmo formato do web). */
export function richCharsToMarkup(chars: RichChar[]): string {
  if (!chars.length) return ''
  let out = ''
  let runText = ''
  let runStyle: RichCharStyle = {}

  const flush = () => {
    if (!runText) return
    out += emitStyled(runText, runStyle)
    runText = ''
  }

  for (const c of chars) {
    if (c.ch === '\n') {
      flush()
      out += '\n'
      runStyle = {}
      continue
    }
    const style = pickStyle(c)
    if (!runText) {
      runText = c.ch
      runStyle = style
      continue
    }
    if (sameStyle(runStyle, style)) {
      runText += c.ch
      continue
    }
    flush()
    runText = c.ch
    runStyle = style
  }
  flush()
  return out.replace(/\n{4,}/g, '\n\n\n')
}

/**
 * Aplica edição de texto puro preservando estilos nas regiões intactas.
 * Prefixo/sufixo comum (padrão de digitação/backspace).
 */
export function syncRichCharsFromPlain(prevChars: RichChar[], nextPlain: string): RichChar[] {
  const prevPlain = richCharsToPlain(prevChars)
  if (prevPlain === nextPlain) return prevChars

  let start = 0
  const minLen = Math.min(prevPlain.length, nextPlain.length)
  while (start < minLen && prevPlain[start] === nextPlain[start]) start += 1

  let endOld = prevPlain.length
  let endNew = nextPlain.length
  while (endOld > start && endNew > start && prevPlain[endOld - 1] === nextPlain[endNew - 1]) {
    endOld -= 1
    endNew -= 1
  }

  const inserted = nextPlain.slice(start, endNew)
  const before = prevChars.slice(0, start)
  const after = prevChars.slice(endOld)
  const inheritFrom = prevChars[start - 1] ?? prevChars[start]
  const inherit = inheritFrom ? pickStyle(inheritFrom) : {}
  const mid: RichChar[] = [...inserted].map((ch) => ({ ch, ...inherit }))
  return [...before, ...mid, ...after]
}

function mergeCharStyle(base: RichCharStyle, patch: RichCharStyle): RichCharStyle {
  const next: RichCharStyle = { ...pickStyle(base) }
  if (patch.bold) next.bold = true
  if (patch.italic) next.italic = true
  if (patch.fg) next.fg = patch.fg
  if (patch.bg) next.bg = patch.bg
  return next
}

export function applyStyleToRichCharsRange(
  chars: RichChar[],
  start: number,
  end: number,
  patch: RichCharStyle
): RichChar[] {
  const s = Math.max(0, Math.min(start, end))
  const e = Math.max(start, end)
  if (s === e) {
    // Sem seleção: insere "texto" estilizado (paridade com wrapSelection do markup).
    const inherit = chars[s - 1] ? pickStyle(chars[s - 1]) : {}
    const style = mergeCharStyle(inherit, patch)
    const inserted: RichChar[] = [...'texto'].map((ch) => ({ ch, ...style }))
    return [...chars.slice(0, s), ...inserted, ...chars.slice(e)]
  }

  return chars.map((c, i) => {
    if (i < s || i >= e) return c
    return { ch: c.ch, ...mergeCharStyle(c, patch) }
  })
}

export function insertBulletInRichChars(
  chars: RichChar[],
  cursor: number
): { chars: RichChar[]; selectionStart: number; selectionEnd: number } {
  const plain = richCharsToPlain(chars)
  const before = plain.slice(0, cursor)
  const lineStart = before.lastIndexOf('\n') + 1
  const line = plain.slice(lineStart).split('\n')[0] ?? ''
  if (/^\s*([•\-])\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
    return { chars, selectionStart: cursor, selectionEnd: cursor }
  }
  const bullet = [...'- '].map((ch) => ({ ch } as RichChar))
  const next = [...chars.slice(0, lineStart), ...bullet, ...chars.slice(lineStart)]
  const pos = cursor + 2
  return { chars: next, selectionStart: pos, selectionEnd: pos }
}

export type RichTextRun = RichCharStyle & { text: string }

/** Agrupa chars em runs para renderização WYSIWYG. */
export function richCharsToRuns(chars: RichChar[]): RichTextRun[] {
  const runs: RichTextRun[] = []
  for (const c of chars) {
    const style = pickStyle(c)
    const last = runs[runs.length - 1]
    if (last && sameStyle(last, style)) {
      last.text += c.ch
      continue
    }
    runs.push({ text: c.ch, ...style })
  }
  return runs
}
