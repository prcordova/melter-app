import { api } from '../http-client';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const ordersApi = {
  checkoutProduct: async (productId: string, quantity: number = 1) => {
    const response = await api.post<ApiResponse<any>>('/api/orders/checkout', {
      productId,
      quantity,
    });
    return response.data;
  },
};

// API de Configurações da Loja
