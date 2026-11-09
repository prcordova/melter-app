import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';

/** Cobre o conteúdo enquanto o app está em segundo plano (bloqueio biométrico ativo). */
export function AppPrivacyCover() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.cover} pointerEvents="none">
      <Ionicons name="lock-closed" size={40} color={colors.secondary.main} />
      <Text style={styles.brand}>Melter</Text>
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    cover: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: c.background.default,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      zIndex: 1000,
      elevation: 1000,
    },
    brand: {
      fontSize: 24,
      fontWeight: '700',
      color: c.text.primary,
    },
  });
