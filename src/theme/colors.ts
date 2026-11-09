/**
 * CORES DO TEMA MELTER (legado — tema claro estático)
 *
 * Telas novas/migradas devem usar `useAppTheme()` / `useThemedStyles()` de
 * `contexts/ThemeContext` com as paletas de `theme/palettes.ts` (claro, roxo escuro, preto).
 * Este objeto segue igual à paleta `light` até todas as telas migrarem.
 */

export const COLORS = {
  // CORES PRINCIPAIS
  primary: {
    main: '#230435', // Roxo escuro - Botões principais
    light: '#3730a3',
    dark: '#1e1b4b',
  },
  
  secondary: {
    main: '#B63385', // Rosa - Botões secundários, acentos
    light: '#d946ef',
    dark: '#9f1239',
  },

  // ÍCONES
  icon: {
    primary: '#1f2937', // Preto/Cinza escuro - Ícones principais
    secondary: '#4b5563', // Cinza médio - Ícones secundários
    active: '#CA3994', // Rosa forte - Ícones ativos (páginas ativas)
    inactive: '#471434', // Rosa fraco - Ícones inativos
  },

  // FUNDOS
  background: {
    default: '#F0E7F5', // Rosa claro - Fundo principal
    paper: '#ffffff', // Branco - Cards, containers
    tertiary: '#f8fafc', // Cinza muito claro
    appbar: '#F0E7F5', // Rosa claro - Header
  },

  // TEXTOS
  text: {
    primary: '#1f2937', // Preto/Cinza escuro - Texto principal
    secondary: '#4b5563', // Cinza médio - Texto secundário
    tertiary: '#6b7280', // Cinza médio-claro
  },

  // GRADIENTES
  gradient: {
    primary: ['#650A97', '#B63385'], // Gradiente primário (roxo → rosa)
    secondary: ['#B63385', '#650A97'], // Gradiente secundário (rosa → roxo)
  },

  // BORDAS
  border: {
    light: '#f1f5f9',
    medium: '#e2e8f0',
    dark: '#cbd5e1',
  },

  // ESTADOS
  states: {
    error: '#dc2626',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
} as const;

// Aliases para facilitar uso
export const PRIMARY_COLOR = COLORS.secondary.main; // #B63385
export const ICON_ACTIVE_COLOR = COLORS.icon.active; // #CA3994
export const ICON_INACTIVE_COLOR = COLORS.icon.inactive; // #471434
export const GRADIENT_COLORS = COLORS.gradient.primary as unknown as readonly [string, string, ...string[]];

