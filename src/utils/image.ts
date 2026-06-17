import { API_CONFIG } from '../config/api.config';

/**
 * Processa URL de imagem do S3 ou servidor local
 * Baseado em: melter/utils/url.ts
 */
export const getImageUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;

  // Se a URL já começa com https://, é uma URL completa do S3
  if (path.startsWith('https://')) {
    return path;
  }

  // Se começa com /uploads/, é uma URL antiga (servidor local)
  if (path.startsWith('/uploads/')) {
    return `${API_CONFIG.BASE_URL}${path}`;
  }

  if (path.startsWith('/assets/')) {
    const base = (API_CONFIG.APP_URL || 'https://www.melter.com.br').replace(/\/$/, '');
    return `${base}${path}`;
  }

  // Para outros casos, assume que é um path relativo do S3
  return `${API_CONFIG.S3_URL}/${path}`;
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

