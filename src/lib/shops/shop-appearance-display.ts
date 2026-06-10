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
