import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { sellerJourneyApi } from '../services/seller-journey';
import type { SellerJourneyProgressPayload } from '../config/seller-journey/types';
import { useAuth } from './AuthContext';

type SellerJourneyContextValue = {
  data: SellerJourneyProgressPayload | null;
  loading: boolean;
  refresh: () => Promise<void>;
  markShareCompleted: () => void;
};

const SellerJourneyContext = createContext<SellerJourneyContextValue | null>(null);

function applyShareStepCompleted(
  payload: SellerJourneyProgressPayload | null
): SellerJourneyProgressPayload | null {
  if (!payload) return null;

  const now = new Date().toISOString();
  let changed = false;
  const steps = payload.steps.map((step) => {
    if (step.key !== 'hasSharedShopLink' || step.completed) return step;
    changed = true;
    return { ...step, completed: true, completedAt: now };
  });

  if (!changed) return payload;

  const completedCount = steps.filter((s) => s.completed).length;
  return {
    ...payload,
    steps,
    completedCount,
    allCompleted: completedCount === payload.totalCount && payload.totalCount > 0,
  };
}

export function SellerJourneyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const enabled = Boolean(user?.id);
  const [data, setData] = useState<SellerJourneyProgressPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const res = await sellerJourneyApi.getProgress();
      if (seq !== fetchSeq.current) return;
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setData(null);
      }
    } catch {
      if (seq !== fetchSeq.current) return;
      setData(null);
    } finally {
      if (seq === fetchSeq.current) {
        setLoading(false);
      }
    }
  }, [enabled]);

  const markShareCompleted = useCallback(() => {
    setData((prev) => applyShareStepCompleted(prev));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ data, loading, refresh, markShareCompleted }),
    [data, loading, refresh, markShareCompleted]
  );

  return (
    <SellerJourneyContext.Provider value={value}>{children}</SellerJourneyContext.Provider>
  );
}

export function useSellerJourneyContext(): SellerJourneyContextValue {
  const ctx = useContext(SellerJourneyContext);
  if (!ctx) {
    throw new Error('useSellerJourneyContext must be used within SellerJourneyProvider');
  }
  return ctx;
}
