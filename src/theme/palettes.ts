/**
 * Paletas do app — espelham `melter/src/config/theme/palettes.ts` (web).
 *
 * - `light` → rosa claro (identidade original, igual a `COLORS`).
 * - `dark`  → roxo escuro (padrão).
 * - `black` → preto (OLED).
 *
 * Os 3 modos são escolhíveis em Preferências. Sem escolha salva, vale `DEFAULT_THEME_MODE`.
 * Componentes leem as cores via `useAppTheme()` / `useThemedStyles()`.
 */
export type AppThemeMode = 'light' | 'dark' | 'black';

/** Tema aplicado a quem nunca escolheu manualmente (mesmo default do web). */
export const DEFAULT_THEME_MODE = 'dark' as AppThemeMode;

/** Modo escuro do toggle rápido claro/escuro — vira `black` quando o default for `black`. */
export const DARK_THEME_MODE: Exclude<AppThemeMode, 'light'> =
  DEFAULT_THEME_MODE === 'black' ? 'black' : 'dark';

export const THEME_MODES: readonly AppThemeMode[] = ['light', 'dark', 'black'];

export function isAppThemeMode(value: unknown): value is AppThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

/** Raio padrão de superfícies (cards, seções) — igual a `SURFACE_RADIUS` do web. */
export const SURFACE_RADIUS = 16;

export type AppPalette = {
  isDark: boolean;
  primary: { main: string; light: string; dark: string; contrastText: string };
  secondary: { main: string; light: string; dark: string; contrastText: string };
  icon: { primary: string; secondary: string; active: string; inactive: string };
  background: { default: string; paper: string; tertiary: string; appbar: string };
  text: { primary: string; secondary: string; tertiary: string };
  gradient: {
    primary: readonly [string, string];
    secondary: readonly [string, string];
  };
  border: { light: string; medium: string; dark: string };
  divider: string;
  action: { hover: string; selected: string };
  states: { error: string; success: string; warning: string; info: string };
  /** Fundo atrás de modais/sheets */
  overlay: string;
};

const STATES = {
  error: '#dc2626',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

const lightPalette: AppPalette = {
  isDark: false,
  primary: { main: '#230435', light: '#3730a3', dark: '#1e1b4b', contrastText: '#ffffff' },
  secondary: { main: '#B63385', light: '#d946ef', dark: '#9f1239', contrastText: '#ffffff' },
  icon: { primary: '#1f2937', secondary: '#4b5563', active: '#CA3994', inactive: '#471434' },
  background: { default: '#F0E7F5', paper: '#ffffff', tertiary: '#f8fafc', appbar: '#F0E7F5' },
  text: { primary: '#1f2937', secondary: '#4b5563', tertiary: '#6b7280' },
  gradient: { primary: ['#650A97', '#B63385'], secondary: ['#B63385', '#650A97'] },
  border: { light: '#f1f5f9', medium: '#e2e8f0', dark: '#cbd5e1' },
  divider: 'rgba(35, 4, 53, 0.09)',
  action: { hover: 'rgba(35, 4, 53, 0.04)', selected: 'rgba(35, 4, 53, 0.08)' },
  states: STATES,
  overlay: 'rgba(15, 23, 42, 0.5)',
};

const darkPalette: AppPalette = {
  isDark: true,
  primary: { main: '#B98CFF', light: '#D4B8FF', dark: '#8F5CE6', contrastText: '#14091F' },
  secondary: { main: '#E0559F', light: '#F07FBC', dark: '#B63385', contrastText: '#ffffff' },
  icon: { primary: '#F5F0FF', secondary: '#B5A8CC', active: '#F062AE', inactive: '#A898C2' },
  background: { default: '#0E0817', paper: '#170F24', tertiary: '#221836', appbar: '#120B1D' },
  text: { primary: '#F5F0FF', secondary: '#B5A8CC', tertiary: '#847699' },
  gradient: { primary: ['#7B2FF7', '#E0459B'], secondary: ['#E0459B', '#7B2FF7'] },
  border: {
    light: 'rgba(196, 167, 255, 0.11)',
    medium: 'rgba(196, 167, 255, 0.18)',
    dark: 'rgba(196, 167, 255, 0.28)',
  },
  divider: 'rgba(196, 167, 255, 0.11)',
  action: { hover: 'rgba(196, 167, 255, 0.08)', selected: 'rgba(196, 167, 255, 0.14)' },
  states: STATES,
  overlay: 'rgba(5, 2, 10, 0.7)',
};

const blackPalette: AppPalette = {
  isDark: true,
  primary: { main: '#C4A6FF', light: '#DCC8FF', dark: '#9D75F0', contrastText: '#0A0A0A' },
  secondary: { main: '#E0559F', light: '#F07FBC', dark: '#B63385', contrastText: '#ffffff' },
  icon: { primary: '#FAFAFA', secondary: '#A1A1AA', active: '#F062AE', inactive: '#A1A1AA' },
  background: { default: '#000000', paper: '#0F0F10', tertiary: '#1A1A1D', appbar: '#000000' },
  text: { primary: '#FAFAFA', secondary: '#A1A1AA', tertiary: '#71717A' },
  gradient: { primary: ['#7B2FF7', '#E0459B'], secondary: ['#E0459B', '#7B2FF7'] },
  border: {
    light: 'rgba(255, 255, 255, 0.09)',
    medium: 'rgba(255, 255, 255, 0.14)',
    dark: 'rgba(255, 255, 255, 0.22)',
  },
  divider: 'rgba(255, 255, 255, 0.09)',
  action: { hover: 'rgba(255, 255, 255, 0.06)', selected: 'rgba(255, 255, 255, 0.10)' },
  states: STATES,
  overlay: 'rgba(0, 0, 0, 0.75)',
};

export const THEME_PALETTES: Record<AppThemeMode, AppPalette> = {
  light: lightPalette,
  dark: darkPalette,
  black: blackPalette,
};
