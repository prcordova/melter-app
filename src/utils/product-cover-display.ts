import type { ImageSourcePropType } from 'react-native';
import { getImageUrl } from './image';

/** Caminho lógico do fundo padrão (igual web). */
export const DEFAULT_PRODUCT_COVER_PATH = '/assets/imgs/bgMelter.jpg';

const DEFAULT_PRODUCT_COVER_ASSET = require('../../assets/bgMelter.jpg');

export function hasCustomProductCover(coverImage?: string | null): boolean {
  return Boolean(coverImage && String(coverImage).trim() !== '');
}

/**
 * URL exibida na vitrine/produto.
 * `avatarFallbackEnabled` vem de `meta.productCoverAvatarFallbackEnabled` (admin > Parâmetros).
 */
export function resolveProductCoverDisplayUrl(options: {
  coverImage?: string | null;
  sellerAvatar?: string | null;
  avatarFallbackEnabled?: boolean;
}): string {
  const { coverImage, sellerAvatar, avatarFallbackEnabled = false } = options;

  if (hasCustomProductCover(coverImage)) {
    const resolved = getImageUrl(coverImage!);
    if (resolved) return resolved;
    if (
      coverImage!.startsWith('http://') ||
      coverImage!.startsWith('https://')
    ) {
      return coverImage!;
    }
    return DEFAULT_PRODUCT_COVER_PATH;
  }

  if (
    avatarFallbackEnabled &&
    sellerAvatar &&
    String(sellerAvatar).trim() !== ''
  ) {
    const resolved = getImageUrl(sellerAvatar);
    if (resolved) return resolved;
    if (
      sellerAvatar.startsWith('http://') ||
      sellerAvatar.startsWith('https://')
    ) {
      return sellerAvatar;
    }
    return DEFAULT_PRODUCT_COVER_PATH;
  }

  return DEFAULT_PRODUCT_COVER_PATH;
}

/** `Image` source para cards e modais no app. */
export function resolveProductCoverImageSource(options: {
  coverImage?: string | null;
  sellerAvatar?: string | null;
  avatarFallbackEnabled?: boolean;
}): ImageSourcePropType {
  const url = resolveProductCoverDisplayUrl(options);

  if (url === DEFAULT_PRODUCT_COVER_PATH) {
    return DEFAULT_PRODUCT_COVER_ASSET;
  }

  const uri = getImageUrl(url) || url;
  if (
    uri &&
    (uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('file://'))
  ) {
    return { uri };
  }

  return DEFAULT_PRODUCT_COVER_ASSET;
}
