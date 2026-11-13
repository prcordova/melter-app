import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '../contexts/ThemeContext';

export type CustomIconAlertSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<CustomIconAlertSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

type CustomIconAlertProps = {
  /** sm = avatar · md = atalho do menu · lg = destaque */
  size?: CustomIconAlertSize;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ícone padrão de pendência/alerta (exclamação) — espelha o web `CustomIconAlert`.
 * Usar à direita dos atalhos e no badge do avatar do header.
 */
export function CustomIconAlert({ size = 'md', style }: CustomIconAlertProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      <Ionicons
        name="alert-circle-outline"
        size={SIZE_PX[size]}
        color={colors.states.warning}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CustomIconAlert;
