import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  StyleSheet,
  type TextInputInstance,
} from 'react-native';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  ref?: React.Ref<TextInputInstance>;
}

export function Input({
  ref,
  label,
  error,
  helperText,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { colors, mode } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error ? colors.states.error : isFocused ? colors.secondary.main : colors.border.medium;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputContainer, { borderColor }, props.editable === false && styles.disabled]}>
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.text.tertiary}
          selectionColor={colors.secondary.main}
          keyboardAppearance={mode === 'light' ? 'light' : 'dark'}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={Boolean(!onRightIconPress)}
            activeOpacity={0.7}
            style={styles.rightIcon}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: c.text.primary,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 8,
      backgroundColor: c.background.paper,
      paddingHorizontal: 16,
    },
    disabled: {
      opacity: 0.6,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: c.text.primary,
    },
    rightIcon: {
      padding: 4,
    },
    error: {
      fontSize: 12,
      color: c.states.error,
      marginTop: 4,
    },
    helper: {
      fontSize: 12,
      color: c.text.secondary,
      marginTop: 4,
    },
  });
