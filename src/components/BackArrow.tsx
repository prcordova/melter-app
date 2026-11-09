import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '../contexts/ThemeContext';

interface BackArrowProps {
  onPress: () => void;
  label?: string; // Texto opcional ao lado da seta (ex: "Voltar para Loja")
}

export function BackArrow({ onPress, label }: BackArrowProps) {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      {label && <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});
