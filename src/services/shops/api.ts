import { api } from '../http-client';
import { SHOP_API } from '../../config/shops/api-paths';
import type { ApiResponse } from '../shared/types';
import type { ShopProductsListMeta } from '../../constants/shop-products-list-meta';

export type MarketplaceProductsListResponse = ApiResponse<any[]> & {
  beyondSearch?: unknown[];
  showBeyondSearch?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  meta?: Partial<ShopProductsListMeta>;
};

export const shopsApi = {
  getProducts: async (params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    sortBy?: 'createdAt' | 'price' | 'salesCount';
    sortOrder?: 'asc' | 'desc';
    showAdultContent?: boolean;
    genderFilter?: string;
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
    if (params.genderFilter && params.genderFilter !== 'all') {
      queryParams.append('genderFilter', params.genderFilter);
    }
    if (params.sellerUsername && params.sellerUsername !== 'all') {
      queryParams.append('sellerUsername', params.sellerUsername);
    }
    if (params.onlyPurchased) {
      queryParams.append('onlyPurchased', 'true');
    }

    const response = await api.get<MarketplaceProductsListResponse>(`${SHOP_API.marketplace.products}?${queryParams.toString()}`);
    return response.data;
  },
};

// Pedidos / checkout de produto único (saldo na carteira)
