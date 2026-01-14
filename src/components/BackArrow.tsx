import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';

interface BackArrowProps {
  onPress: () => void;
  label?: string; // Texto opcional ao lado da seta (ex: "Voltar para Loja")
}

export function BackArrow({ onPress, label }: BackArrowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
      {label && <Text style={styles.label}>{label}</Text>}
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
    color: COLORS.text.primary,
    fontWeight: '500',
  },
});

