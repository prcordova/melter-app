import React, { useMemo, type ReactNode } from 'react'
import {
  Linking,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import {
  tokenizeRichInlineNested,
  type RichInlineToken,
} from '../lib/rich-text'

type RichPostTextProps = {
  text: string
  style?: StyleProp<TextStyle>
  /** Cor padrão do texto (quando sem {{fg}}). */
  color?: string
}

const URL_RE =
  /(https?:\/\/[^\s<>"')\]]+|www\.[a-zA-Z0-9][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9][a-zA-Z0-9-]*)*[^\s<>"')\]]*)/gi

function openUrl(raw: string) {
  const href = raw.startsWith('www.') ? `https://${raw}` : raw
  void Linking.openURL(href)
}

function splitMarginStyles(style?: StyleProp<TextStyle>): {
  wrap: ViewStyle
  text: TextStyle
} {
  const flat = StyleSheet.flatten(style) || {}
  const {
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginHorizontal,
    marginVertical,
    ...text
  } = flat as TextStyle & ViewStyle
  return {
    wrap: {
      margin,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      marginHorizontal,
      marginVertical,
    },
    text,
  }
}

function renderPlainWithLinks(
  value: string,
  keyPrefix: string,
  textStyle?: StyleProp<TextStyle>
): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  const re = new RegExp(URL_RE.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(value)) !== null) {
    if (match.index > last) {
      nodes.push(
        <Text key={`${keyPrefix}-t-${last}`} style={textStyle}>
          {value.slice(last, match.index)}
        </Text>
      )
    }
    const url = match[0].replace(/[.,;:!?)]+$/g, '')
    nodes.push(
      <Text
        key={`${keyPrefix}-u-${match.index}`}
        style={[textStyle, { color: '#2563eb', textDecorationLine: 'underline' }]}
        onPress={() => openUrl(url)}
      >
        {url}
      </Text>
    )
    last = match.index + match[0].length
  }
  if (last < value.length) {
    nodes.push(
      <Text key={`${keyPrefix}-t-end`} style={textStyle}>
        {value.slice(last)}
      </Text>
    )
  }
  if (nodes.length === 0) {
    nodes.push(
      <Text key={`${keyPrefix}-empty`} style={textStyle}>
        {value}
      </Text>
    )
  }
  return nodes
}

function renderTokens(
  tokens: RichInlineToken[],
  keyPrefix: string,
  inherited: TextStyle
): ReactNode[] {
  return tokens.map((token, i) => {
    const key = `${keyPrefix}-${i}`
    if (token.type === 'text') {
      return (
        <Text key={key} style={inherited}>
          {renderPlainWithLinks(token.text, key, inherited)}
        </Text>
      )
    }
    if (token.type === 'bold') {
      const next = { ...inherited, fontWeight: '700' as const }
      return (
        <Text key={key} style={next}>
          {renderTokens(token.children, key, next)}
        </Text>
      )
    }
    if (token.type === 'italic') {
      const next = { ...inherited, fontStyle: 'italic' as const }
      return (
        <Text key={key} style={next}>
          {renderTokens(token.children, key, next)}
        </Text>
      )
    }
    if (token.type === 'fg') {
      const next = { ...inherited, color: token.color }
      return (
        <Text key={key} style={next}>
          {renderTokens(token.children, key, next)}
        </Text>
      )
    }
    const next = {
      ...inherited,
      backgroundColor: token.color,
      borderRadius: 3,
    }
    return (
      <Text key={key} style={next}>
        {renderTokens(token.children, key, next)}
      </Text>
    )
  })
}

/**
 * Renderiza markup de post (negrito, itálico, cores, fundo, bullets) no app.
 * Paridade com `ClickableText` + `richFormatting` do web.
 */
export function RichPostText({ text, style, color = '#1e293b' }: RichPostTextProps) {
  const lines = useMemo(() => (text || '').replace(/\r\n/g, '\n').split('\n'), [text])
  const { wrap, text: textStyle } = useMemo(() => splitMarginStyles(style), [style])
  const baseStyle: TextStyle = { color, ...textStyle }

  return (
    <View style={wrap}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trimStart()
        const isBullet =
          trimmed.startsWith('•') || /^-\s+\S/.test(trimmed) || /^-\s*$/.test(trimmed)
        const isNumbered = /^\d+\.\s/.test(trimmed)
        const displayLine =
          isBullet && trimmed.startsWith('-')
            ? trimmed.replace(/^-\s*/, '• ')
            : line

        if (line === '' && lineIndex > 0) {
          return <View key={`gap-${lineIndex}`} style={{ height: 10 }} />
        }

        return (
          <Text
            key={`line-${lineIndex}`}
            style={[
              baseStyle,
              {
                marginTop: lineIndex > 0 ? (isBullet || isNumbered ? 4 : 6) : 0,
                ...(isBullet || isNumbered ? { paddingLeft: 14 } : null),
              },
            ]}
          >
            {renderTokens(tokenizeRichInlineNested(displayLine), `l${lineIndex}`, {
              color: baseStyle.color,
              fontSize: baseStyle.fontSize,
              lineHeight: baseStyle.lineHeight,
              fontWeight: baseStyle.fontWeight,
            })}
          </Text>
        )
      })}
    </View>
  )
}
