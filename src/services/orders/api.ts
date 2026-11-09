import { api } from '../http-client';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const ordersApi = {
  /** `privatePurchase` (padrão true no servidor): vendedor vê identificador mascarado. */
  checkoutProduct: async (productId: string, quantity: number = 1, privatePurchase = true) => {
    const response = await api.post<ApiResponse<any>>('/api/orders/checkout', {
      productId,
      quantity,
      privatePurchase,
    });
    return response.data;
  },
};

// API de Configurações da Loja
