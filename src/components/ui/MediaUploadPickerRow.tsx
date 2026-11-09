import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';

const DEFAULT_WATERMARK = require('../../../assets/bgMelter.jpg');

type Props = {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function MediaUploadPickerRow({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  loading = false,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={[styles.container, (disabled || loading) && styles.containerDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <ImageBackground
        source={DEFAULT_WATERMARK}
        style={styles.watermark}
        imageStyle={styles.watermarkImage}
        resizeMode="cover"
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.secondary.main} />
        ) : (
          <View style={styles.iconColumn} pointerEvents="none">
            <Ionicons name="images-outline" size={40} color={colors.text.primary} style={styles.icon} />
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border.medium,
    overflow: 'hidden',
    backgroundColor: c.background.tertiary,
    minHeight: 100,
    maxHeight: 128,
    aspectRatio: 21 / 9,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  watermark: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  watermarkImage: {
    opacity: 0.14,
  },
  iconColumn: {
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    opacity: 0.35,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text.secondary,
    letterSpacing: 0.3,
  },
});
