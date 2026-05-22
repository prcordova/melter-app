import { api } from '../http-client';
import type { PlatformFeedInfoItem } from '../../types/platform-feed-info';
import type { ApiResponse } from '../shared/types';

export const platformFeedInfoApi = {
  getItems: async () => {
    const response = await api.get<ApiResponse<{ items: PlatformFeedInfoItem[] }>>('/api/platform-feed-info');
    return response.data;
  },
};

// API de Anúncios
