import { useAuth } from '../contexts/AuthContext';
import { useSellerJourneyContext } from '../contexts/SellerJourneyContext';

export function useSellerJourney() {
  const { user } = useAuth();
  const ctx = useSellerJourneyContext();

  if (!user?.id) {
    return {
      data: null,
      loading: false,
      refresh: async () => {},
      markShareCompleted: () => {},
    };
  }

  return ctx;
}
