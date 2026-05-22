import { api } from '../http-client';
import { SHOP_API } from '../../config/shops/api-paths';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const shopsApi = {
  getProducts: async (params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    sortBy?: 'createdAt' | 'price' | 'salesCount';
    sortOrder?: 'asc' | 'desc';
    showAdultContent?: boolean;
    sellerUsername?: string;
    onlyPurchased?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.categoryId && params.categoryId !== 'all') {
      queryParams.append('categoryId', params.categoryId);
    }
    if (params.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.showAdultContent !== undefined) {
      queryParams.append('showAdultContent', String(params.showAdultContent));
    }
    if (params.sellerUsername && params.sellerUsername !== 'all') {
      queryParams.append('sellerUsername', params.sellerUsername);
    }
    if (params.onlyPurchased) {
      queryParams.append('onlyPurchased', 'true');
    }

    const response = await api.get<ApiResponse<any>>(`${SHOP_API.marketplace.products}?${queryParams.toString()}`);
    return response.data;
  },
};

// Pedidos / checkout de produto único (saldo na carteira)
