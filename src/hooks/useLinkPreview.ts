import { useEffect, useState } from 'react';
import { linksApi, type LinkPreviewData } from '../services/links/api';
import { extractFirstUrl } from '../utils/link-utils';

const previewCache = new Map<string, LinkPreviewData | null>();

/**
 * Preview do primeiro link do texto (alinhado ao web `useLinkPreview`).
 * `debounceMs` > 0 para composer (espera o usuário parar de digitar).
 */
export function useLinkPreview(
  text: string | null | undefined,
  options: { enabled?: boolean; debounceMs?: number } = {}
) {
  const { enabled = true, debounceMs = 0 } = options;
  const url = enabled ? extractFirstUrl(text) : null;
  const [preview, setPreview] = useState<LinkPreviewData | null>(() =>
    url ? previewCache.get(url) ?? null : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setPreview(null);
      setLoading(false);
      return;
    }

    if (previewCache.has(url)) {
      setPreview(previewCache.get(url) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      linksApi
        .getPreview(url)
        .then((response) => {
          const data = response?.success && response.data ? response.data : null;
          previewCache.set(url, data);
          if (!cancelled) setPreview(data);
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url, debounceMs]);

  return { preview, loading, url };
}
