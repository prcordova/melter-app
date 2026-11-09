import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

interface BackButtonProps {
  onPress?: () => void;
  title?: string;
}

export function BackButton({ onPress, title = 'Voltar' }: BackButtonProps) {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color={colors.secondary.main} />
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    text: {
      fontSize: 16,
      fontWeight: '600',
      color: c.secondary.main,
    },
  });
