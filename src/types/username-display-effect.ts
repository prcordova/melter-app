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

/** API / storage podem mandar boolean, string ou número. */
function coerceEffectEnabled(raw: unknown): boolean {
  if (raw === true || raw === 1) return true
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'yes'
  }
  return false
}

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function pickGradientColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const t = value.trim()
  return HEX_COLOR_RE.test(t) ? t : fallback
}

export function normalizeUsernameDisplayEffect(raw: unknown): UsernameDisplayEffectConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<UsernameDisplayEffectConfig>
  const enabled = coerceEffectEnabled(o.enabled)
  if (!enabled) {
    return { ...DEFAULT_USERNAME_DISPLAY_EFFECT, enabled: false }
  }
  return {
    enabled: true,
    motionMode: o.motionMode === 'animated' ? 'animated' : 'static',
    gradientFrom: pickGradientColor(o.gradientFrom, DEFAULT_USERNAME_DISPLAY_EFFECT.gradientFrom),
    gradientTo: pickGradientColor(o.gradientTo, DEFAULT_USERNAME_DISPLAY_EFFECT.gradientTo),
    gradientHoverFrom: pickGradientColor(
      o.gradientHoverFrom,
      DEFAULT_USERNAME_DISPLAY_EFFECT.gradientHoverFrom
    ),
    gradientHoverTo: pickGradientColor(o.gradientHoverTo, DEFAULT_USERNAME_DISPLAY_EFFECT.gradientHoverTo),
    glowIntensity: clampInt(o.glowIntensity, 0, 100, DEFAULT_USERNAME_DISPLAY_EFFECT.glowIntensity),
    hoverGlowIntensity: clampInt(o.hoverGlowIntensity, 0, 100, DEFAULT_USERNAME_DISPLAY_EFFECT.hoverGlowIntensity),
    applyHover: o.applyHover !== false,
    explorerMode: o.explorerMode === 'hover_only' ? 'hover_only' : 'always',
  }
}
