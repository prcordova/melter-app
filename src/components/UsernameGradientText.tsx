import React, { useEffect, useMemo } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Platform,
  type TextStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
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

/** Chaves de layout que no Android podem fazer o texto-máscara medir 0px dentro do MaskedView. */
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

/** A camada de glow precisa ficar com glyphs transparentes; `color` do tema (ex. branco no perfil) cobria o gradiente. */
function stripColorAndBackground(input?: TextStyle | null): TextStyle | undefined {
  if (!input) return undefined;
  const { color: _c, backgroundColor: _b, ...rest } = input as TextStyle & {
    backgroundColor?: string;
  };
  return Object.keys(rest).length ? (rest as TextStyle) : undefined;
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
  /** Web (`UsernameGradientName`): 600 sem efeito, 700 com gradiente. */
  const resolvedFontWeight: TextStyle['fontWeight'] =
    normalized?.enabled ? '700' : (fontWeight ?? DEFAULT_WEIGHT);
  const textStyle: TextStyle = { fontSize, fontWeight: resolvedFontWeight };

  const { wrapperStyle: layoutFromStyle, textRest: textFromStyle } = useMemo(
    () => splitLayoutAndTextStyles(style),
    [style]
  );

  const motionMode = normalized?.enabled ? normalized.motionMode : 'static';

  const slide = useSharedValue(0);

  useEffect(() => {
    if (!normalized?.enabled || motionMode !== 'animated') {
      slide.value = 0;
      return;
    }
    slide.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [normalized?.enabled, motionMode, slide]);

  const animatedGradientStyle = useAnimatedStyle(() => {
    if (!normalized?.enabled || motionMode !== 'animated') {
      return { transform: [{ translateX: 0 }] };
    }
    const shift = interpolate(slide.value, [0, 1], [-28, 28]);
    return { transform: [{ translateX: shift }] };
  });

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

  const {
    gradientFrom,
    gradientTo,
    glowIntensity,
  } = normalized;

  const tGlow = Math.min(100, Math.max(0, glowIntensity)) / 100;
  const shadowRadius = 2 + tGlow * 10;
  const shadowOpacity = 0.25 + tGlow * 0.45;

  const colors =
    motionMode === 'animated'
      ? ([gradientFrom, gradientTo, gradientFrom, gradientTo] as const)
      : ([gradientFrom, gradientTo] as const);

  const textForMask = stripColorAndBackground(textFromStyle ?? (StyleSheet.flatten(style) as TextStyle));

  const mask = (
    <Text
      style={[textStyle, textForMask, styles.maskText]}
      numberOfLines={numberOfLines}
      ellipsizeMode="tail"
    >
      {label}
    </Text>
  );

  const gradientTrackNode =
    motionMode === 'animated' ? (
      <Animated.View style={[styles.gradientTrack, animatedGradientStyle]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientFill}
        />
      </Animated.View>
    ) : (
      <View style={styles.gradientTrack}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientFill}
        />
      </View>
    );

  const gradientInner = (
    <View style={styles.wrap} {...(Platform.OS === 'android' ? { collapsable: false as const } : {})}>
      <MaskedView
        style={[styles.masked, { height: fontSize + 6 }]}
        maskElement={mask}
        {...(Platform.OS === 'android' ? { androidRenderingMode: 'software' as const } : {})}
      >
        {gradientTrackNode}
      </MaskedView>
      <Text
        pointerEvents="none"
        style={[
          textStyle,
          textForMask,
          {
            textShadowColor: gradientFrom,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: shadowRadius,
            opacity: shadowOpacity,
          },
          styles.glowLayer,
        ]}
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );

  const layoutWrap = (
    <View
      style={[
        layoutFromStyle,
        { minWidth: 0, alignSelf: layoutFromStyle?.alignSelf ?? 'flex-start' },
      ]}
      {...(Platform.OS === 'android' ? { collapsable: false as const } : {})}
    >
      {gradientInner}
    </View>
  );

  if (containerStyle) {
    return <View style={containerStyle}>{layoutFromStyle ? layoutWrap : gradientInner}</View>;
  }

  return layoutFromStyle ? layoutWrap : gradientInner;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  masked: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  maskText: {
    color: '#000',
    backgroundColor: 'transparent',
  },
  gradientTrack: {
    ...StyleSheet.absoluteFillObject,
    width: '220%',
    left: '-60%',
  },
  gradientFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
  },
});
