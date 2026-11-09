import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet } from 'react-native';
import {
  DARK_THEME_MODE,
  DEFAULT_THEME_MODE,
  THEME_PALETTES,
  isAppThemeMode,
  type AppPalette,
  type AppThemeMode,
} from '../theme/palettes';

const THEME_STORAGE_KEY = 'melter-theme-mode';

type ThemeContextValue = {
  mode: AppThemeMode;
  colors: AppPalette;
  isDark: boolean;
  setMode: (mode: AppThemeMode) => void;
  /** Alterna claro ↔ escuro (escuro = `DARK_THEME_MODE`). */
  toggleDark: (dark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppThemeMode>(DEFAULT_THEME_MODE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && isAppThemeMode(stored)) setModeState(stored);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: AppThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleDark = useCallback(
    (dark: boolean) => setMode(dark ? DARK_THEME_MODE : 'light'),
    [setMode]
  );

  const value = useMemo<ThemeContextValue>(() => {
    const colors = THEME_PALETTES[mode];
    return { mode, colors, isDark: colors.isDark, setMode, toggleDark };
  }, [mode, setMode, toggleDark]);

  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}

/**
 * Estilos dependentes do tema, recriados só quando a paleta muda.
 * Uso: `const createStyles = (c: AppPalette) => StyleSheet.create({...})` no módulo
 * e `const styles = useThemedStyles(createStyles)` no componente.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: AppPalette) => T
): T {
  const { colors } = useAppTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
