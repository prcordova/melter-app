import React, { useCallback, useId, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  Pressable,
} from 'react-native'
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { COLORS } from '../theme/colors'

const DOUBLE_TAP_MS = 280
const GRADIENT = COLORS.gradient.primary // roxo → rosa

type PostDoubleTapLikeProps = {
  children: ReactNode
  onLike: () => void
  onSingleTap?: () => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

function GradientHeart({ size, gradientId }: { size: number; gradientId: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={GRADIENT[0]} />
          <Stop offset="100%" stopColor={GRADIENT[1]} />
        </LinearGradient>
      </Defs>
      <Path
        fill={`url(#${gradientId})`}
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </Svg>
  )
}

/**
 * Double-tap → curtir + coração animado no centro (estilo Instagram).
 */
export function PostDoubleTapLike({
  children,
  onLike,
  onSingleTap,
  disabled = false,
  style,
}: PostDoubleTapLikeProps) {
  const reactId = useId().replace(/:/g, '')
  const lastTapRef = useRef(0)
  const singleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [burstKey, setBurstKey] = useState(0)
  const scale = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  const clearSingleTimer = () => {
    if (singleTimerRef.current) {
      clearTimeout(singleTimerRef.current)
      singleTimerRef.current = null
    }
  }

  const playBurst = useCallback(() => {
    setBurstKey((k) => k + 1)
    scale.setValue(0.2)
    opacity.setValue(0)
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.2,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.35,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.delay(400),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [opacity, scale])

  const fireLike = useCallback(() => {
    if (disabled) return
    clearSingleTimer()
    lastTapRef.current = 0
    onLike()
    playBurst()
  }, [disabled, onLike, playBurst])

  const handlePress = () => {
    if (disabled) return
    const now = Date.now()
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      fireLike()
      return
    }
    lastTapRef.current = now
    clearSingleTimer()
    if (onSingleTap) {
      singleTimerRef.current = setTimeout(() => {
        singleTimerRef.current = null
        onSingleTap()
      }, DOUBLE_TAP_MS)
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[style, burstKey > 0 ? styles.bursting : null]}
    >
      <View style={styles.wrap}>
        {children}
        {burstKey > 0 ? (
          <View pointerEvents="none" style={styles.burstWrap}>
            <Animated.View
              key={burstKey}
              style={{
                opacity,
                transform: [{ scale }],
                // sombra rosa/roxa (sem borda preta de emoji)
                shadowColor: GRADIENT[1],
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.55,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <GradientHeart size={72} gradientId={`like-heart-${reactId}-${burstKey}`} />
            </Animated.View>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'visible',
  },
  bursting: {
    zIndex: 40,
    overflow: 'visible',
  },
  burstWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    overflow: 'visible',
  },
})
