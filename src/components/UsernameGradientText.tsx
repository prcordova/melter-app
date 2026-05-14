import React, { useEffect } from 'react';
import { Text, View, StyleSheet, type TextStyle, type StyleProp, type ViewStyle } from 'react-native';
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

  if (!normalized?.enabled) {
    const plain = (
      <Text
        style={[textStyle, style]}
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    );
    if (containerStyle) {
      return <View style={containerStyle}>{plain}</View>;
    }
    return plain;
  }

  const {
    motionMode,
    gradientFrom,
    gradientTo,
    glowIntensity,
  } = normalized;

  const tGlow = Math.min(100, Math.max(0, glowIntensity)) / 100;
  const shadowRadius = 2 + tGlow * 10;
  const shadowOpacity = 0.25 + tGlow * 0.45;

  const slide = useSharedValue(0);

  useEffect(() => {
    if (motionMode !== 'animated') {
      slide.value = 0;
      return;
    }
    slide.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [motionMode, slide]);

  const animatedGradientStyle = useAnimatedStyle(() => {
    if (motionMode !== 'animated') {
      return { transform: [{ translateX: 0 }] };
    }
    const shift = interpolate(slide.value, [0, 1], [-28, 28]);
    return { transform: [{ translateX: shift }] };
  });

  const colors =
    motionMode === 'animated'
      ? ([gradientFrom, gradientTo, gradientFrom, gradientTo] as const)
      : ([gradientFrom, gradientTo] as const);

  const mask = (
    <Text
      style={[textStyle, style, styles.maskText]}
      numberOfLines={numberOfLines}
      ellipsizeMode="tail"
    >
      {label}
    </Text>
  );

  const gradientInner = (
    <View style={styles.wrap}>
      <MaskedView style={[styles.masked, { height: fontSize + 6 }]} maskElement={mask}>
        <Animated.View style={[styles.gradientTrack, animatedGradientStyle]}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientFill}
          />
        </Animated.View>
      </MaskedView>
      <Text
        pointerEvents="none"
        style={[
          textStyle,
          styles.glowLayer,
          style,
          {
            textShadowColor: gradientFrom,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: shadowRadius,
            opacity: shadowOpacity,
          },
        ]}
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );

  if (containerStyle) {
    return <View style={containerStyle}>{gradientInner}</View>;
  }

  return gradientInner;
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
