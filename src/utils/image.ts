import { API_CONFIG } from '../config/api.config';

/** Mesmos prefixos do web (`melter/src/lib/s3-private.config`, profile/shop media). */
const PRODUCT_FILES_PREFIX = 'product-files/';
const LEGACY_PROFILE_PRIVATE_PREFIX = 'profile-private/';
const PROFILE_MEDIA_SEGMENT = 'profile-media';
const SHOP_MEDIA_SEGMENT = 'shop-media';

function apiBase(): string {
  return API_CONFIG.BASE_URL.replace(/\/$/, '');
}

function extractProductFileKey(stored: string): string | null {
  if (stored.startsWith(PRODUCT_FILES_PREFIX)) return stored.split('?')[0] ?? stored;
  const loose = stored.match(/product-files\/[^/]+\/[^/]+\/[^\s?#]+/i);
  return loose ? loose[0] : null;
}

function isPrivateMediaRef(stored: string, segment: string): boolean {
  const key = extractProductFileKey(stored) ?? stored;
  return key.startsWith(PRODUCT_FILES_PREFIX) && key.includes(`/${segment}/`);
}

/**
 * Processa URL de imagem do S3 ou servidor local.
 * Espelha `melter/utils/url.ts` (mídia privada de perfil/loja passa pelo proxy assinado da API).
 */
export const getImageUrl = (path?: string | null): string | undefined => {
  if (path == null) return undefined;
  const s = String(path).trim();
  if (!s) return undefined;

  if (s.startsWith('/api/media/profile-private') || s.startsWith('/api/media/shop-private')) {
    return `${apiBase()}${s}`;
  }

  if (s.startsWith('https://') || s.startsWith('http://')) {
    return s;
  }

  if (isPrivateMediaRef(s, SHOP_MEDIA_SEGMENT)) {
    return `${apiBase()}/api/media/shop-private?key=${encodeURIComponent(s)}`;
  }

  if (s.startsWith(LEGACY_PROFILE_PRIVATE_PREFIX) || isPrivateMediaRef(s, PROFILE_MEDIA_SEGMENT)) {
    return `${apiBase()}/api/media/profile-private?key=${encodeURIComponent(s)}`;
  }

  // Bucket privado: só via URL assinada pela API (produto / stories / KYC).
  if (
    s.startsWith(PRODUCT_FILES_PREFIX) ||
    s.startsWith('stories/') ||
    s.startsWith('seller-verification/')
  ) {
    return undefined;
  }

  if (s.startsWith('/uploads/')) {
    return `${apiBase()}${s}`;
  }

  if (s.startsWith('/assets/')) {
    return `${(API_CONFIG.APP_URL || API_CONFIG.BASE_URL).replace(/\/$/, '')}${s}`;
  }

  return `${API_CONFIG.S3_URL}/${s.replace(/^\//, '')}`;
};

/**
 * Retorna URL do avatar do usuário ou undefined
 */
export const getAvatarUrl = (avatar?: string | null): string | undefined => {
  return getImageUrl(avatar);
};

/**
 * Pega as iniciais do nome de usuário para usar como fallback
 */
export const getUserInitials = (username?: string): string => {
  if (!username) return '?';
  return username.charAt(0).toUpperCase();
};
