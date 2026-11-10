import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SelectRow } from './SelectRow';
import { useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

export type CustomSelectOption = {
  value: string;
  label: string;
};

type Props = {
  label?: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  helperText?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Select padronizado do app (paridade com web `CustomSelect`).
 * Usa `SelectRow` (sheet) em vez do Picker nativo — evita corte de letras nas bordas.
 */
export function CustomSelect({
  label,
  value,
  options,
  onChange,
  helperText,
  disabled = false,
  style,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? label ?? 'Selecionar';

  return (
    <View style={[styles.wrap, style, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      {label ? (
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      ) : null}
      <SelectRow label={selectedLabel} value={value} options={options} onChange={onChange} size="full" />
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
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
      fontSize: 14,
      fontWeight: '600',
      color: c.text.primary,
      marginBottom: 8,
      flexShrink: 1,
    },
    helper: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 16,
      color: c.text.secondary,
      flexShrink: 1,
    },
  });
