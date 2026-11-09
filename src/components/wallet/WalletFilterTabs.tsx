import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  type ScrollViewInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';

export interface WalletFilterTabOption {
  value: string;
  label: string;
}

interface WalletFilterTabsProps {
  options: WalletFilterTabOption[];
  value: string;
  onChange: (value: string) => void;
}

const ARROW_WIDTH = 32;
const EDGE_TOLERANCE = 4;

export function WalletFilterTabs({ options, value, onChange }: WalletFilterTabsProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offsetX, setOffsetX] = useState(0);

  const canScrollLeft = offsetX > EDGE_TOLERANCE;
  const canScrollRight = offsetX + layoutWidth < contentWidth - EDGE_TOLERANCE;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffsetX(event.nativeEvent.contentOffset.x);
  };

  const scrollBy = (direction: 1 | -1) => {
    const maxOffset = Math.max(0, contentWidth - layoutWidth);
    const next = Math.min(maxOffset, Math.max(0, offsetX + direction * layoutWidth * 0.6));
    scrollRef.current?.scrollTo({ x: next, animated: true });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => setContentWidth(width)}
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {canScrollLeft ? (
        <TouchableOpacity
          style={[styles.arrow, styles.arrowLeft]}
          onPress={() => scrollBy(-1)}
          accessibilityLabel="Rolar filtros para a esquerda"
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      ) : null}
      {canScrollRight ? (
        <TouchableOpacity
          style={[styles.arrow, styles.arrowRight]}
          onPress={() => scrollBy(1)}
          accessibilityLabel="Rolar filtros para a direita"
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 16,
  },
  content: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: c.background.tertiary,
    borderWidth: 1,
    borderColor: c.border.medium,
  },
  chipActive: {
    backgroundColor: c.secondary.main,
    borderColor: c.secondary.main,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.text.secondary,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  arrow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: ARROW_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: c.background.paper,
    borderWidth: 1,
    borderColor: c.border.light,
  },
  arrowLeft: {
    left: 0,
  },
  arrowRight: {
    right: 0,
  },
});
