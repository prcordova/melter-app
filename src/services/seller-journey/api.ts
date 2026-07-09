import { api } from '../http-client';
import type { ApiResponse } from '../shared/types';
import { SELLER_JOURNEY_API } from '../../config/seller-journey/api-paths';
import type { SellerJourneyProgressPayload } from '../../config/seller-journey/types';

export const sellerJourneyApi = {
  getProgress: async () => {
    const response = await api.get<ApiResponse<SellerJourneyProgressPayload>>(
      SELLER_JOURNEY_API.me
    );
    return response.data;
  },

  recordShare: async (channel: 'native' | 'whatsapp' | 'instagram' | 'telegram' | 'other') => {
    const response = await api.post<ApiResponse<unknown>>(SELLER_JOURNEY_API.share, {
      channel,
    });
    return response.data;
  },

  dismissFab: async () => {
    const response = await api.post<ApiResponse<unknown>>(SELLER_JOURNEY_API.dismissFab);
    return response.data;
  },
};
