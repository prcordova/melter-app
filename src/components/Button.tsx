import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENT_COLORS } from '../theme/colors';

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

// Configuração do gradiente
const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 1, y: 0 } as const;

export function Button({
  children,
  loading = false,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  icon,
  ...props
}: ButtonProps) {
  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      overflow: 'hidden', // Para o gradiente respeitar borderRadius
    };

    // Estilo quando desabilitado
    const disabledStyle: ViewStyle =
      disabled || loading ? { opacity: 0.5 } : {};

    return {
      ...baseStyle,
      ...disabledStyle,
    };
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Tamanhos
    const sizeStyles: Record<string, ViewStyle> = {
      xs: { paddingVertical: 4, paddingHorizontal: 10, minHeight: 28 },
      sm: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 32 },
      md: { paddingVertical: 12, paddingHorizontal: 24, minHeight: 48 },
      lg: { paddingVertical: 16, paddingHorizontal: 32, minHeight: 56 },
    };

    // Variantes (para outline e ghost)
    const variantStyles: Record<string, ViewStyle> = {
      primary: {}, // Gradiente será aplicado via LinearGradient
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: COLORS.secondary.main,
      },
      ghost: {
        backgroundColor: COLORS.background.default, // Fundo rosa claro (igual web)
        borderWidth: 2,
        borderColor: COLORS.secondary.main,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
    };

    // Tamanhos de texto
    const sizeStyles: Record<string, TextStyle> = {
      xs: { fontSize: 12 },
      sm: { fontSize: 14 },
      md: { fontSize: 16 },
      lg: { fontSize: 18 },
    };

    // Cores de texto por variante
    const variantStyles: Record<string, TextStyle> = {
      primary: { color: '#ffffff' },
      outline: { color: COLORS.secondary.main },
      ghost: { color: COLORS.secondary.main },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={variant === 'primary' ? '#ffffff' : COLORS.secondary.main}
          size="small"
          animating={true}
        />
      );
    }
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon}
        {typeof children === 'string' ? (
          <Text style={getTextStyle()}>{children}</Text>
        ) : (
          children
        )}
      </View>
    );
  };

  // Para variante primary, envolver em LinearGradient
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        disabled={Boolean(disabled || loading)}
        activeOpacity={0.7}
        style={[getContainerStyle(), style]}
        {...props}
      >
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={getButtonStyle()}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Para outras variantes, usar View normal
  return (
    <TouchableOpacity
      style={[getContainerStyle(), getButtonStyle(), style]}
      disabled={Boolean(disabled || loading)}
      activeOpacity={0.7}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}
