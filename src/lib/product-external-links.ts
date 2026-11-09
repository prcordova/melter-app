/** Espelho de `melter/src/lib/product-external-links.ts` — mesma regra link × arquivo hospedado. */

export function isHostedProductMediaUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.toLowerCase().includes('/product-files/');
}

export function isExternalProductLinkFile(file: { url?: string; fileType?: string }): boolean {
  const url = (file.url || '').trim();
  if (file.fileType !== 'document') return false;
  if (!/^https?:\/\//i.test(url)) return false;
  return !isHostedProductMediaUrl(url);
}
