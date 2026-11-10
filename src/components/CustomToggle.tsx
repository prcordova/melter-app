import React from 'react';
import { View, Text, Switch, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Exibe “Ativado/Desativado” no lugar do label quando true (padrão web). */
  showStatus?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Toggle padronizado (paridade com web `CustomToggle`).
 * Texto com `minWidth: 0` / `flexShrink` para não cortar letras no layout.
 */
export function CustomToggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  showStatus = false,
  style,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const title = showStatus ? (checked ? 'Ativado' : 'Desativado') : label;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.textCol}>
        <Text style={styles.label} numberOfLines={2}>
          {showStatus ? `${label} — ${title}` : title}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={checked}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border.medium, true: colors.secondary.main }}
        thumbColor="#ffffff"
        style={styles.switch}
      />
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      width: '100%',
      minWidth: 0,
      paddingVertical: 4,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
      paddingRight: 4,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text.primary,
      flexShrink: 1,
    },
    description: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 16,
      color: c.text.secondary,
      flexShrink: 1,
    },
    switch: {
      flexShrink: 0,
    },
  });
