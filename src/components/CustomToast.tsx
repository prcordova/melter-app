import React from 'react';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { COLORS } from '../theme/colors';

// Configuração customizada do Toast
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: COLORS.states.success,
        borderLeftWidth: 4,
        height: 60,
        alignSelf: 'center',
        width: '92%',
        maxWidth: 420,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text.primary,
      }}
      text2Style={{
        fontSize: 13,
        color: COLORS.text.secondary,
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: COLORS.states.error,
        borderLeftWidth: 4,
        height: 60,
        alignSelf: 'center',
        width: '92%',
        maxWidth: 420,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text.primary,
      }}
      text2Style={{
        fontSize: 13,
        color: COLORS.text.secondary,
      }}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: COLORS.secondary.main,
        borderLeftWidth: 4,
        height: 60,
        alignSelf: 'center',
        width: '92%',
        maxWidth: 420,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text.primary,
      }}
      text2Style={{
        fontSize: 13,
        color: COLORS.text.secondary,
      }}
    />
  ),
};

export function CustomToast() {
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

