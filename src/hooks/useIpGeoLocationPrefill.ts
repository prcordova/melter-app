import { useEffect, useState } from 'react';
import { api } from '../services/http-client';

export type PendingIpGeoLocation = {
  countryCode: string;
  region?: string | null;
  regionName?: string | null;
  city?: string | null;
};

/** Detecta país/estado/cidade via IP (GET /api/geo/location) — mesmo fluxo do web. */
export function useIpGeoLocationPrefill(enabled: boolean) {
  const [geoLoading, setGeoLoading] = useState(enabled);
  const [pendingGeo, setPendingGeo] = useState<PendingIpGeoLocation | null>(null);

  useEffect(() => {
    if (!enabled) {
      setGeoLoading(false);
      return;
    }

    let cancelled = false;

    const detectLocation = async () => {
      try {
        const response = await api.get<{
          success?: boolean;
          data?: {
            countryCode?: string;
            region?: string;
            stateCode?: string;
            regionName?: string;
            stateName?: string;
            city?: string;
          };
        }>('/api/geo/location');

        const data = response.data;
        if (!cancelled && data?.success && data.data?.countryCode) {
          setPendingGeo({
            countryCode: data.data.countryCode,
            region: data.data.region ?? data.data.stateCode ?? null,
            regionName: data.data.regionName ?? data.data.stateName ?? null,
            city: data.data.city ?? null,
          });
        }
      } catch (error) {
        console.error('[useIpGeoLocationPrefill]', error);
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    };

    void detectLocation();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    geoLoading,
    pendingGeo,
    clearPendingGeo: () => setPendingGeo(null),
  };
}
