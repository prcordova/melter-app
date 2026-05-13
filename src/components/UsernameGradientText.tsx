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
  const textStyle: TextStyle = { fontSize, fontWeight };

  if (!normalized?.enabled) {
    return (
      <Text style={[textStyle, style]} numberOfLines={numberOfLines}>
        {label}
      </Text>
    );
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
    <Text style={[textStyle, styles.maskText, style]} numberOfLines={numberOfLines}>
      {label}
    </Text>
  );

  return (
    <View style={[styles.wrap, containerStyle]}>
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
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignSelf: 'flex-start',
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
