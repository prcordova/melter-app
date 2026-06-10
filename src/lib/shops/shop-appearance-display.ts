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

export type ShopAppearanceSource = ShopAppearanceView;

function readBackgroundFromShopRecord(
  shop: Record<string, unknown> | null | undefined
): Pick<ShopAppearanceView, 'backgroundImage' | 'backgroundImageUrl'> {
  const backgroundImageUrl =
    typeof shop?.backgroundImageUrl === 'string' && shop.backgroundImageUrl.trim()
      ? shop.backgroundImageUrl.trim()
      : null;
  const backgroundImageKey =
    typeof shop?.backgroundImage === 'string' && shop.backgroundImage.trim()
      ? shop.backgroundImage.trim()
      : null;

  return {
    backgroundImage: backgroundImageUrl ?? backgroundImageKey,
    backgroundImageUrl,
  };
}

/** Aparência exibida na vitrine: dono usa settings locais; visitante só vê dados do vendedor. */
export function buildShopPageVisual(
  ownerShop: Record<string, unknown> | null | undefined,
  ownerSettings: ShopAppearanceSource | null | undefined,
  isOwnShop: boolean
): ShopAppearanceView {
  const shopBackground = readBackgroundFromShopRecord(ownerShop);

  if (!isOwnShop) {
    return {
      ...shopBackground,
      backgroundMode: ownerShop?.backgroundMode === 'top' ? 'top' : 'full',
      backgroundOverlay: Boolean(ownerShop?.backgroundOverlay),
      backgroundOverlayOpacity:
        typeof ownerShop?.backgroundOverlayOpacity === 'number'
          ? ownerShop.backgroundOverlayOpacity
          : 0,
      titleColor: typeof ownerShop?.titleColor === 'string' ? ownerShop.titleColor : null,
      titleDisplayEffect:
        (ownerShop?.titleDisplayEffect as UsernameDisplayEffectConfig | null | undefined) ?? null,
    };
  }

  const settingsBackground =
    ownerSettings?.backgroundImageUrl ?? ownerSettings?.backgroundImage ?? null;

  return {
    backgroundImage: settingsBackground ?? shopBackground.backgroundImage ?? null,
    backgroundImageUrl:
      ownerSettings?.backgroundImageUrl ?? shopBackground.backgroundImageUrl ?? null,
    backgroundMode: (ownerSettings?.backgroundMode ??
      (ownerShop?.backgroundMode === 'top' ? 'top' : 'full')) as 'full' | 'top',
    backgroundOverlay:
      ownerSettings?.backgroundOverlay ?? Boolean(ownerShop?.backgroundOverlay),
    backgroundOverlayOpacity:
      ownerSettings?.backgroundOverlayOpacity ??
      (typeof ownerShop?.backgroundOverlayOpacity === 'number'
        ? ownerShop.backgroundOverlayOpacity
        : 0),
    titleColor:
      ownerSettings?.titleColor ??
      (typeof ownerShop?.titleColor === 'string' ? ownerShop.titleColor : null),
    titleDisplayEffect:
      ownerSettings?.titleDisplayEffect ??
      (ownerShop?.titleDisplayEffect as UsernameDisplayEffectConfig | null | undefined) ??
      null,
  };
}

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

/** Sombra leve — paridade com boxShadow do header web. */
const shopHeaderElevation = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.12,
  shadowRadius: 3,
  elevation: 2,
} as const;

/** Pill do título — fundo branco e borda rosa (padrão da vitrine, paridade web). */
export const shopHeaderContrastTitleStyle = {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#B63385',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 6,
  alignSelf: 'flex-start',
  maxWidth: '100%',
  ...shopHeaderElevation,
} as const;

/** Ícone circular do header (engrenagem, compartilhar) — padrão da vitrine. */
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
  ...shopHeaderElevation,
} as const;

export const shopHeaderContrastIconButtonStyle = shopHeaderContrastSettingsButtonStyle;
