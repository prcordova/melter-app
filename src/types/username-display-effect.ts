/**
 * Efeito visual do @ (PRO / PRO+) — alinhado ao web (`melter/src/types/username-display-effect.types.ts`).
 */

export type UsernameDisplayExplorerMode = 'always' | 'hover_only'

export type UsernameDisplayMotionMode = 'static' | 'animated'

export interface UsernameDisplayEffectConfig {
  enabled: boolean
  motionMode: UsernameDisplayMotionMode
  gradientFrom: string
  gradientTo: string
  gradientHoverFrom: string
  gradientHoverTo: string
  glowIntensity: number
  hoverGlowIntensity: number
  applyHover: boolean
  explorerMode: UsernameDisplayExplorerMode
}

export const DEFAULT_USERNAME_DISPLAY_EFFECT: UsernameDisplayEffectConfig = {
  enabled: false,
  motionMode: 'static',
  gradientFrom: '#9333ea',
  gradientTo: '#ec4899',
  gradientHoverFrom: '#22d3ee',
  gradientHoverTo: '#a78bfa',
  glowIntensity: 40,
  hoverGlowIntensity: 72,
  applyHover: true,
  explorerMode: 'always',
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(max, Math.max(min, Math.round(v)))
}

export function normalizeUsernameDisplayEffect(raw: unknown): UsernameDisplayEffectConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<UsernameDisplayEffectConfig>
  if (!o.enabled) {
    return { ...DEFAULT_USERNAME_DISPLAY_EFFECT, enabled: false }
  }
  return {
    enabled: true,
    motionMode: o.motionMode === 'animated' ? 'animated' : 'static',
    gradientFrom: typeof o.gradientFrom === 'string' ? o.gradientFrom : DEFAULT_USERNAME_DISPLAY_EFFECT.gradientFrom,
    gradientTo: typeof o.gradientTo === 'string' ? o.gradientTo : DEFAULT_USERNAME_DISPLAY_EFFECT.gradientTo,
    gradientHoverFrom:
      typeof o.gradientHoverFrom === 'string' ? o.gradientHoverFrom : DEFAULT_USERNAME_DISPLAY_EFFECT.gradientHoverFrom,
    gradientHoverTo:
      typeof o.gradientHoverTo === 'string' ? o.gradientHoverTo : DEFAULT_USERNAME_DISPLAY_EFFECT.gradientHoverTo,
    glowIntensity: clampInt(o.glowIntensity, 0, 100, DEFAULT_USERNAME_DISPLAY_EFFECT.glowIntensity),
    hoverGlowIntensity: clampInt(o.hoverGlowIntensity, 0, 100, DEFAULT_USERNAME_DISPLAY_EFFECT.hoverGlowIntensity),
    applyHover: o.applyHover !== false,
    explorerMode: o.explorerMode === 'hover_only' ? 'hover_only' : 'always',
  }
}
