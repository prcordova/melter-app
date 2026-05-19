import { API_CONFIG } from '../config/api.config';

export function getShopPublicPath(username: string): string {
  return `/user/${encodeURIComponent(username)}/shop`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

export function buildShopShareUrl(username: string, baseUrl?: string): string {
  const base = normalizeBaseUrl(baseUrl || API_CONFIG.APP_URL || '');
  if (!base) {
    throw new Error('EXPO_PUBLIC_API_URL não configurada');
  }
  const path = getShopPublicPath(username);
  const ref = encodeURIComponent(username);
  return `${base}${path}?ref=${ref}`;
}
