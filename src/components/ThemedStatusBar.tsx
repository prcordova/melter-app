import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { useAppTheme } from '../contexts/ThemeContext';

/**
 * Barra de status no tema atual, só enquanto a tela está em foco.
 * Telas ainda não migradas mantêm a barra global (`App.tsx`).
 */
export function ThemedStatusBar() {
  const isFocused = useIsFocused();
  const { isDark } = useAppTheme();
  if (!isFocused) return null;
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
