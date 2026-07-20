import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { API_CONFIG } from '../config/api.config';

export type ShopShareChannel = 'whatsapp' | 'instagram' | 'telegram';

export type ShopShareOptionKey = 'copy' | ShopShareChannel;

export const SHOP_SHARE_MODAL_OPTIONS: Array<{
  key: ShopShareOptionKey;
  label: string;
}> = [
  { key: 'copy', label: 'Copiar link' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'telegram', label: 'Telegram' },
];
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

/** Código de indicação (uso interno). O link real já inclui ?ref= no share. */
export function getShopReferralCodeLabel(username: string): string {
  return `?ref=@${username}`;
}

export function getShopSharePayload(username: string): { url: string; text: string } {
  const url = buildShopShareUrl(username);
  const text = `Confira minha loja no Melter: ${url}`;
  return { url, text };
}

export async function copyShopShareLink(username: string): Promise<void> {
  await Clipboard.setStringAsync(buildShopShareUrl(username));
}

export async function shareShopLink(username: string, channel: ShopShareChannel): Promise<boolean> {
  const { url, text } = getShopSharePayload(username);

  if (channel === 'whatsapp') {
    const waDeepLink = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const waWeb = `https://wa.me/?text=${encodeURIComponent(text)}`;
    try {
      const canOpen = await Linking.canOpenURL(waDeepLink);
      await Linking.openURL(canOpen ? waDeepLink : waWeb);
      return true;
    } catch {
      return false;
    }
  }

  if (channel === 'instagram') {
    await Clipboard.setStringAsync(url);
    try {
      await Linking.openURL('https://www.instagram.com/');
      return true;
    } catch {
      return false;
    }
  }

  if (channel === 'telegram') {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    try {
      await Linking.openURL(telegramUrl);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/** @deprecated use shareShopLink */
export async function shareShopForJourney(
  username: string,
  channel: ShopShareChannel
): Promise<boolean> {
  return shareShopLink(username, channel);
}
