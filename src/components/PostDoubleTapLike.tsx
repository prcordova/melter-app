import React, { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  Pressable,
} from 'react-native'

const DOUBLE_TAP_MS = 280

type PostDoubleTapLikeProps = {
  children: ReactNode
  onLike: () => void
  onSingleTap?: () => void
  disabled?: boolean
  emoji?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Double-tap → curtir + coração animado no centro (estilo Instagram).
 */
export function PostDoubleTapLike({
  children,
  onLike,
  onSingleTap,
  disabled = false,
  emoji = '❤️',
  style,
}: PostDoubleTapLikeProps) {
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
    <Pressable onPress={handlePress} disabled={disabled} style={style}>
      <View style={styles.wrap}>
        {children}
        {burstKey > 0 ? (
          <View pointerEvents="none" style={styles.burstWrap}>
            <Animated.Text
              key={burstKey}
              style={[
                styles.burst,
                {
                  opacity,
                  transform: [{ scale }],
                },
              ]}
            >
              {emoji}
            </Animated.Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  burstWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  burst: {
    fontSize: 72,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
})
