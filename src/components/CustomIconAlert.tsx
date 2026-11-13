import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export type CustomIconAlertSize = 'sm' | 'md' | 'lg';

/** Amarelo do alerta triangular — sync com web `CUSTOM_ICON_ALERT_COLOR`. */
export const CUSTOM_ICON_ALERT_COLOR = '#F5C518';

const SIZE_PX: Record<CustomIconAlertSize, number> = {
  sm: 17,
  md: 20,
  lg: 22,
};

type CustomIconAlertProps = {
  /** sm = avatar · md = atalho do menu · lg = destaque */
  size?: CustomIconAlertSize;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ícone padrão de atenção: triângulo amarelo com exclamação (espelha o web).
 */
export function CustomIconAlert({ size = 'md', style }: CustomIconAlertProps) {
  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      <Ionicons name="warning" size={SIZE_PX[size]} color={CUSTOM_ICON_ALERT_COLOR} />
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
