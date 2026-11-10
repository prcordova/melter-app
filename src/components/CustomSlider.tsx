import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Incremento dos botões − / + (padrão = step). */
  steppersStep?: number;
  disabled?: boolean;
  label?: string;
  /** Sufixo no label (ex.: `%`). */
  valueSuffix?: string;
  showSteppers?: boolean;
  style?: StyleProp<ViewStyle>;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function snap(n: number, min: number, max: number, step: number) {
  if (step <= 0) return clamp(n, min, max);
  const snapped = Math.round((n - min) / step) * step + min;
  return clamp(snapped, min, max);
}

/**
 * Slider com − / + nas laterais (paridade de UX com controles de opacidade/brilho do app).
 * O centro é um track arrastável — não apenas uma barra estática.
 */
export function CustomSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  steppersStep,
  disabled = false,
  label,
  valueSuffix = '',
  showSteppers = true,
  style,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const safeValue = clamp(value, min, max);
  const range = Math.max(1, max - min);
  const ratio = (safeValue - min) / range;
  const bump = steppersStep ?? step;

  const emitFromX = useCallback(
    (locationX: number) => {
      if (disabled || trackWidthRef.current <= 0) return;
      const nextRatio = clamp(locationX / trackWidthRef.current, 0, 1);
      const raw = min + nextRatio * range;
      onChange(snap(raw, min, max, step));
    },
    [disabled, max, min, onChange, range, step]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          emitFromX(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          emitFromX(evt.nativeEvent.locationX);
        },
      }),
    [disabled, emitFromX]
  );

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidthRef.current = w;
    setTrackWidth(w);
  };

  const adjust = (delta: number) => {
    if (disabled) return;
    onChange(snap(valueRef.current + delta, min, max, step));
  };

  const thumbLeft =
    trackWidth > 0 ? Math.max(0, Math.min(trackWidth - 16, ratio * trackWidth - 8)) : 0;

  return (
    <View style={[styles.wrap, style, disabled && styles.disabled]}>
      {label ? (
        <Text style={styles.label} numberOfLines={2}>
          {label}: {Math.round(safeValue)}
          {valueSuffix}
        </Text>
      ) : null}
      <View style={styles.row}>
        {showSteppers ? (
          <TouchableOpacity
            style={styles.stepper}
            onPress={() => adjust(-bump)}
            disabled={disabled || safeValue <= min}
            accessibilityLabel="Diminuir"
            hitSlop={8}
          >
            <Ionicons name="remove" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        ) : null}

        <View
          style={styles.trackHit}
          onLayout={onTrackLayout}
          {...panResponder.panHandlers}
        >
          <View style={styles.trackBg} />
          <View
            style={[
              styles.trackFill,
              { width: `${ratio * 100}%`, backgroundColor: colors.secondary.main },
            ]}
          />
          <View style={[styles.thumb, { left: thumbLeft, backgroundColor: colors.secondary.main }]} />
        </View>

        {showSteppers ? (
          <TouchableOpacity
            style={styles.stepper}
            onPress={() => adjust(bump)}
            disabled={disabled || safeValue >= max}
            accessibilityLabel="Aumentar"
            hitSlop={8}
          >
            <Ionicons name="add" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    wrap: {
      width: '100%',
      minWidth: 0,
      marginBottom: 8,
    },
    disabled: {
      opacity: 0.55,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text.primary,
      marginBottom: 8,
      flexShrink: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      minWidth: 0,
    },
    stepper: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: c.background.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    trackHit: {
      flex: 1,
      minWidth: 0,
      height: 36,
      justifyContent: 'center',
      position: 'relative',
    },
    trackBg: {
      height: 8,
      borderRadius: 4,
      backgroundColor: c.background.tertiary,
      width: '100%',
    },
    trackFill: {
      position: 'absolute',
      left: 0,
      top: 14,
      height: 8,
      borderRadius: 4,
    },
    thumb: {
      position: 'absolute',
      width: 16,
      height: 16,
      borderRadius: 8,
      top: 10,
      borderWidth: 2,
      borderColor: c.background.paper,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
  });
