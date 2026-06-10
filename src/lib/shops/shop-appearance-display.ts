import { getImageUrl } from '../../utils/image';
import type { UsernameDisplayEffectConfig } from '../../types/username-display-effect';

export type ShopAppearanceView = {
  backgroundImage?: string | null;
  backgroundImageUrl?: string | null;
  backgroundMode?: 'full' | 'top' | null;
  backgroundOverlay?: boolean | null;
  backgroundOverlayOpacity?: number | null;
  titleColor?: string | null;
  titleDisplayEffect?: UsernameDisplayEffectConfig | null;
};

/** URL exibível (pública, assinada ou key S3). */
export function resolveShopBackgroundImageUrl(
  shop: ShopAppearanceView | null | undefined
): string | undefined {
  const raw =
    (typeof shop?.backgroundImageUrl === 'string' && shop.backgroundImageUrl.trim()) ||
    (typeof shop?.backgroundImage === 'string' && shop.backgroundImage.trim()) ||
    '';
  if (!raw) return undefined;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return getImageUrl(raw);
}

export function hasShopBackgroundImage(shop: ShopAppearanceView | null | undefined): boolean {
  return Boolean(resolveShopBackgroundImageUrl(shop));
}

export function getShopBackgroundMode(shop: ShopAppearanceView | null | undefined): 'full' | 'top' {
  return shop?.backgroundMode === 'top' ? 'top' : 'full';
}

export function getShopOverlayOpacity(shop: ShopAppearanceView | null | undefined): number {
  if (shop?.backgroundOverlayOpacity === undefined || shop.backgroundOverlayOpacity === null) {
    return 0;
  }
  return Math.max(0, Math.min(100, Number(shop.backgroundOverlayOpacity) || 0));
}

export function shouldShowShopColorOverlay(shop: ShopAppearanceView | null | undefined): boolean {
  return shop?.backgroundOverlay !== false && getShopOverlayOpacity(shop) > 0;
}

export function resolveShopTitleColor(
  shop: ShopAppearanceView | null | undefined,
  fallback: string
): string {
  const raw = shop?.titleColor?.trim();
  return raw || fallback;
}

/** Pill do título — contorno rosa e fundo branco (paridade com botão outline web). */
export const shopHeaderContrastTitleStyle = {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#B63385',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 6,
  alignSelf: 'flex-start',
  maxWidth: '100%',
} as const;

/** Engrenagem — círculo branco com ícone rosa. */
export const shopHeaderContrastSettingsButtonStyle = {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#B63385',
  borderRadius: 18,
  width: 36,
  height: 36,
  padding: 0,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
} as const;
