import { api } from '../http-client';
import { SHOP_API } from '../../config/shops/api-paths';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const shopAnalyticsApi = {
  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.productId) queryParams.append('productId', params.productId);
    
    const url = `${SHOP_API.me.analytics}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<ApiResponse<any>>(url);
    return response.data;
  },
};

// API de Comunidade da Loja
