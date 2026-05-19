import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { userApi } from '../services/api';
import { useAuth } from './AuthContext';
import {
  resolveExplorerDiscoveryPreference,
  type DiscoveryPreference,
  type DiscoveryViewMode,
} from '../utils/explorer-discovery-personalization';

type DiscoveryPreferenceContextValue = {
  preference: DiscoveryPreference;
  loading: boolean;
  refreshDiscoveryPreference: () => Promise<void>;
};

const DiscoveryPreferenceContext = createContext<DiscoveryPreferenceContextValue | undefined>(
  undefined
);

const NEUTRAL = resolveExplorerDiscoveryPreference([]);

export function DiscoveryPreferenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preference, setPreference] = useState<DiscoveryPreference>(NEUTRAL);
  const [loading, setLoading] = useState(false);

  const refreshDiscoveryPreference = useCallback(async () => {
    if (!user?.id) {
      setPreference(NEUTRAL);
      return;
    }

    setLoading(true);
    try {
      const response = await userApi.getUserDemographics();
      if (response.success) {
        setPreference(resolveExplorerDiscoveryPreference(response.data?.platformPurposes));
      } else {
        setPreference(NEUTRAL);
      }
    } catch (error) {
      console.error('[DiscoveryPreference] Erro ao carregar propósitos:', error);
      setPreference(NEUTRAL);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshDiscoveryPreference();
  }, [refreshDiscoveryPreference]);

  const value = useMemo(
    () => ({
      preference,
      loading,
      refreshDiscoveryPreference,
    }),
    [preference, loading, refreshDiscoveryPreference]
  );

  return (
    <DiscoveryPreferenceContext.Provider value={value}>
      {children}
    </DiscoveryPreferenceContext.Provider>
  );
}

export function useDiscoveryPreference(): DiscoveryPreferenceContextValue {
  const ctx = useContext(DiscoveryPreferenceContext);
  if (!ctx) {
    throw new Error('useDiscoveryPreference deve ser usado dentro de DiscoveryPreferenceProvider');
  }
  return ctx;
}

/** Rótulos iguais à web (explorer.discoveryMode). */
export const DISCOVERY_MODE_LABELS: Record<DiscoveryViewMode, string> = {
  shops: 'Vendedores',
  users: 'Comunidade',
};
