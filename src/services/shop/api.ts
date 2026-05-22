import { api } from '../http-client';
import { SHOP_API } from '../../config/shops/api-paths';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const shopApi = {
  getSettings: async () => {
    const response = await api.get<ApiResponse<{
      isEnabled: boolean;
      visibility: 'public' | 'preview' | 'friends' | 'followers';
      saleNotifications: boolean;
      sellerVerification?: any;
    }>>(SHOP_API.me.settings);
    return response.data;
  },
  updateSettings: async (data: {
    isEnabled?: boolean;
    visibility?: 'public' | 'preview' | 'friends' | 'followers';
    saleNotifications?: boolean;
  }) => {
    const response = await api.put<ApiResponse<any>>(SHOP_API.me.settings, data);
    return response.data;
  },
  deleteShop: async () => {
    const response = await api.delete<ApiResponse<any>>(SHOP_API.me.settings);
    return response.data;
  },
};

// API de Verificação de Vendedor
