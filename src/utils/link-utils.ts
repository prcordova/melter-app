/**
 * Utilitários de links em texto — subset de `melter/utils/link-utils.ts`.
 * Sem `new URL().hostname` (implementação parcial no React Native).
 */

const URL_REGEX =
  /(https?:\/\/[^\s<>"')\]]+|www\.[a-zA-Z0-9][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9][a-zA-Z0-9-]*)*[^\s<>"')\]]*)/gi;

function trimTrailingUrlPunctuation(url: string): string {
  return url.replace(/[.,;:!?)]+$/g, '');
}

export function extractFirstUrl(text: string | null | undefined): string | null {
  if (!text) return null;

  const markdown = text.match(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdown?.[2]) return trimTrailingUrlPunctuation(markdown[2]);

  const matches = text.match(URL_REGEX);
  if (!matches || matches.length === 0 || !matches[0]) return null;

  const url = trimTrailingUrlPunctuation(matches[0]);
  return url.startsWith('www.') ? `https://${url}` : url;
}

export function ensureHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function getUrlHostname(raw: string | null | undefined): string {
  if (!raw) return '';
  const match = ensureHttpUrl(raw).match(/^https?:\/\/([^/?#:]+)/i);
  return (match?.[1] ?? '').toLowerCase();
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  return Boolean(url) && /youtube\.com|youtu\.be/.test(String(url));
}

export function extractYouTubeVideoId(url: string): string | null {
  return url.match(/[?&]v=([^&]+)/)?.[1] ?? url.match(/youtu\.be\/([^?]+)/)?.[1] ?? null;
}

export function getYouTubeThumbnail(videoId: string, quality: 'max' | 'hq' = 'max'): string {
  const file = quality === 'max' ? 'maxresdefault.jpg' : 'hqdefault.jpg';
  return `https://img.youtube.com/vi/${videoId}/${file}`;
}

/** Favicon via Google (funciona para a maioria dos domínios). */
export function getLinkFaviconUrl(hostnameOrUrl: string | null | undefined): string {
  const host = (hostnameOrUrl?.includes('://') ? getUrlHostname(hostnameOrUrl) : hostnameOrUrl ?? '')
    .replace(/^www\./i, '');
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128` : '';
}

/** Domínios oficiais Melter (não são “site externo”). */
export function isMelterSiteUrl(raw: string | null | undefined): boolean {
  const host = getUrlHostname(raw).replace(/^www\./i, '');
  return host === 'melter.com.br' || host.endsWith('.melter.com.br');
}
