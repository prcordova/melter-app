import React, { useMemo } from 'react';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { useAppTheme } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

function createToastConfig(c: AppPalette) {
  const toastStyle = (accent: string) => ({
    borderLeftColor: accent,
    borderLeftWidth: 4,
    height: 60,
    alignSelf: 'center' as const,
    width: '92%' as const,
    maxWidth: 420,
    backgroundColor: c.background.paper,
  });
  const contentContainerStyle = { paddingHorizontal: 15 };
  const text1Style = { fontSize: 15, fontWeight: '600' as const, color: c.text.primary };
  const text2Style = { fontSize: 13, color: c.text.secondary };

  return {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={toastStyle(c.states.success)}
        contentContainerStyle={contentContainerStyle}
        text1Style={text1Style}
        text2Style={text2Style}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={toastStyle(c.states.error)}
        contentContainerStyle={contentContainerStyle}
        text1Style={text1Style}
        text2Style={text2Style}
      />
    ),
    info: (props: any) => (
      <InfoToast
        {...props}
        style={toastStyle(c.secondary.main)}
        contentContainerStyle={contentContainerStyle}
        text1Style={text1Style}
        text2Style={text2Style}
      />
    ),
  };
}

export function CustomToast() {
  const { colors } = useAppTheme();
  const toastConfig = useMemo(() => createToastConfig(colors), [colors]);
  return <Toast config={toastConfig} />;
}

// Helper function para facilitar o uso
export const showToast = {
  success: (text1: string, text2?: string) => {
    Toast.show({
      type: 'success',
      text1,
      text2,
      position: 'top',
      visibilityTime: 3000,
    });
  },
  error: (text1: string, text2?: string) => {
    Toast.show({
      type: 'error',
      text1,
      text2,
      position: 'top',
      visibilityTime: 4000,
    });
  },
  info: (text1: string, text2?: string) => {
    Toast.show({
      type: 'info',
      text1,
      text2,
      position: 'top',
      visibilityTime: 3000,
    });
  },
};

