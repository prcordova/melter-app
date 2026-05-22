import { api } from '../http-client';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const categoriesApi = {
  getCategories: async (username?: string) => {
    const queryParams = new URLSearchParams();
    if (username) queryParams.append('username', username);
    
    const url = `/api/categories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<ApiResponse<any[]>>(url);
    return response.data;
  },
};

// API de Planos de Assinatura
