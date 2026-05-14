import React, { useMemo, useState, useId } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Platform,
  type TextStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import type { UsernameDisplayEffectConfig } from '../types/username-display-effect';
import { normalizeUsernameDisplayEffect } from '../types/username-display-effect';

type Props = {
  username: string;
  prefix?: string;
  effect?: UsernameDisplayEffectConfig | null;
  /** Tamanho do texto (feed ≈15, perfil ≈22). */
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
};

const DEFAULT_FONT = 15;
const DEFAULT_WEIGHT: TextStyle['fontWeight'] = '700';

/** Chaves de layout aplicadas ao wrapper externo, não ao texto SVG. */
const LAYOUT_KEYS_FOR_MASK_WRAPPER = new Set([
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'transform',
  'opacity',
  'zIndex',
]);

function splitLayoutAndTextStyles(
  styleProp: StyleProp<TextStyle>
): { wrapperStyle?: ViewStyle; textRest?: TextStyle } {
  const flat = StyleSheet.flatten(styleProp) as Record<string, unknown> | undefined;
  if (!flat) return {};
  const wrapper: Record<string, unknown> = {};
  const text: Record<string, unknown> = {};
  for (const key of Object.keys(flat)) {
    if (LAYOUT_KEYS_FOR_MASK_WRAPPER.has(key)) {
      wrapper[key] = flat[key];
    } else {
      text[key] = flat[key];
    }
  }
  return {
    wrapperStyle: Object.keys(wrapper).length ? (wrapper as ViewStyle) : undefined,
    textRest: Object.keys(text).length ? (text as TextStyle) : undefined,
  };
}

function stripColorAndBackground(input?: TextStyle | null): TextStyle | undefined {
  if (!input) return undefined;
  const { color: _c, backgroundColor: _b, ...rest } = input as TextStyle & {
    backgroundColor?: string;
  };
  return Object.keys(rest).length ? (rest as TextStyle) : undefined;
}

function fontWeightToSvg(fontWeight: TextStyle['fontWeight'] | undefined): string | number {
  if (fontWeight == null) return '600';
  if (typeof fontWeight === 'number') return fontWeight;
  const s = String(fontWeight).toLowerCase();
  if (s === 'bold') return '700';
  if (s === 'normal') return '400';
  const n = Number(fontWeight);
  return Number.isFinite(n) ? n : '600';
}

/**
 * Texto com gradiente no preenchimento dos glifos — equivalente ao web (`background-clip: text`).
 * Usa `react-native-svg` em vez de MaskedView + LinearGradient (layout Android instável).
 */
function GradientUsernameSvg({
  label,
  fontSize,
  fontWeight,
  colors,
  textForMask,
  numberOfLines,
}: {
  label: string;
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  colors: readonly string[];
  textForMask?: TextStyle;
  numberOfLines: number;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9_]/g, '_');
  const gradId = `ug_${reactId}`;

  const [box, setBox] = useState(() => ({
    w: Math.max(24, Math.ceil(label.length * fontSize * 0.56)),
    h: Math.ceil(fontSize * 1.45),
  }));

  const onTextLayout = (e: { nativeEvent: { lines: { width: number; height: number }[] } }) => {
    const lines = e.nativeEvent.lines;
    if (!lines?.length) return;
    let w = 0;
    let h = 0;
    for (const line of lines) {
      w = Math.max(w, line.width);
      h += line.height;
    }
    const nw = Math.ceil(w + 2);
    const nh = Math.ceil(h + 4);
    if (nw <= 0 || nh <= 0) return;
    setBox((prev) => (nw !== prev.w || nh !== prev.h ? { w: nw, h: nh } : prev));
  };

  const fw = fontWeightToSvg(fontWeight);
  const textY = Math.ceil(fontSize * 0.92);

  const stops =
    colors.length >= 4
      ? [
          <Stop key="0" offset="0%" stopColor={colors[0]} />,
          <Stop key="1" offset="33%" stopColor={colors[1]} />,
          <Stop key="2" offset="66%" stopColor={colors[2]} />,
          <Stop key="3" offset="100%" stopColor={colors[3]} />,
        ]
      : [
          <Stop key="0" offset="0%" stopColor={colors[0]} />,
          <Stop key="1" offset="100%" stopColor={colors[1] ?? colors[0]} />,
        ];

  const letterSpacing =
    typeof textForMask?.letterSpacing === 'number' ? textForMask.letterSpacing : undefined;

  return (
    <View
      style={styles.svgOuter}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.measureGhost,
          { fontSize, fontWeight: fw as TextStyle['fontWeight'], letterSpacing },
          textForMask,
          Platform.OS === 'android' ? { includeFontPadding: false } : null,
        ]}
        numberOfLines={numberOfLines}
        onTextLayout={onTextLayout}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        {label}
      </Text>
      <Svg
        width={box.w}
        height={box.h}
        style={styles.svgLayer}
        viewBox={`0 0 ${box.w} ${box.h}`}
        pointerEvents="none"
      >
        <Defs>
          <SvgLinearGradient id={gradId} x1="0" y1="0" x2={box.w} y2="0" gradientUnits="userSpaceOnUse">
            {stops}
          </SvgLinearGradient>
        </Defs>
        <SvgText
          fill={`url(#${gradId})`}
          x={0}
          y={textY}
          fontSize={fontSize}
          fontWeight={fw}
          letterSpacing={letterSpacing}
          fontFamily={typeof textForMask?.fontFamily === 'string' ? textForMask.fontFamily : undefined}
        >
          {label}
        </SvgText>
      </Svg>
    </View>
  );
}

export function UsernameGradientText({
  username,
  prefix = '',
  effect,
  fontSize = DEFAULT_FONT,
  fontWeight = DEFAULT_WEIGHT,
  style,
  containerStyle,
  numberOfLines = 1,
}: Props) {
  const label = `${prefix}${username}`;
  const normalized = normalizeUsernameDisplayEffect(effect ?? null);
  const resolvedFontWeight: TextStyle['fontWeight'] =
    normalized?.enabled ? '700' : (fontWeight ?? DEFAULT_WEIGHT);
  const textStyle: TextStyle = { fontSize, fontWeight: resolvedFontWeight };

  const { wrapperStyle: layoutFromStyle, textRest: textFromStyle } = useMemo(
    () => splitLayoutAndTextStyles(style),
    [style]
  );

  if (!normalized?.enabled) {
    const plain = (
      <Text
        style={[textStyle, textFromStyle ?? style]}
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    );
    const plainWrapped =
      layoutFromStyle != null ? (
        <View style={[layoutFromStyle, { minWidth: 0, alignSelf: layoutFromStyle.alignSelf ?? 'flex-start' }]}>
          {plain}
        </View>
      ) : (
        plain
      );
    if (containerStyle) {
      return <View style={containerStyle}>{plainWrapped}</View>;
    }
    return plainWrapped;
  }

  const { motionMode, gradientFrom, gradientTo } = normalized;

  const colors =
    motionMode === 'animated'
      ? ([gradientFrom, gradientTo, gradientFrom, gradientTo] as const)
      : ([gradientFrom, gradientTo] as const);

  const textForMask = stripColorAndBackground(textFromStyle ?? (StyleSheet.flatten(style) as TextStyle));

  const gradientBlock = (
    <GradientUsernameSvg
      label={label}
      fontSize={fontSize}
      fontWeight={resolvedFontWeight}
      colors={colors}
      textForMask={textForMask}
      numberOfLines={numberOfLines}
    />
  );

  const layoutWrap = (
    <View
      style={[
        layoutFromStyle,
        { minWidth: 0, alignSelf: layoutFromStyle?.alignSelf ?? 'flex-start' },
      ]}
    >
      {gradientBlock}
    </View>
  );

  if (containerStyle) {
    return <View style={containerStyle}>{layoutFromStyle ? layoutWrap : gradientBlock}</View>;
  }

  return layoutFromStyle ? layoutWrap : gradientBlock;
}

const styles = StyleSheet.create({
  svgOuter: {
    position: 'relative',
    alignSelf: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: '100%',
  },
  measureGhost: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
    color: '#000',
    padding: 0,
    margin: 0,
    maxWidth: '100%',
    pointerEvents: 'none',
  },
  svgLayer: {
    alignSelf: 'flex-start',
  },
});
