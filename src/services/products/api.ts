import { api } from '../http-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiResponse } from '../shared/types';
import type { ShopProductsListMeta } from '../../constants/shop-products-list-meta';

export type ProductsListResponse = ApiResponse<any[]> & {
  meta?: Partial<ShopProductsListMeta>;
};

export const productsApi = {
  getProducts: async (params?: {
    username?: string;
    isActive?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.username) queryParams.append('username', params.username);
    if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
    
    const url = `/api/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<ProductsListResponse>(url);
    return response.data;
  },
  getProduct: async (productId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/products/${productId}`);
    return response.data;
  },
  createProduct: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/api/products', data);
    return response.data;
  },
  updateProduct: async (productId: string, data: any) => {
    const response = await api.patch<ApiResponse<any>>(`/api/products/${productId}`, data);
    return response.data;
  },
  deleteProduct: async (productId: string) => {
    const response = await api.patch<ApiResponse<any>>(`/api/products/${productId}`, {
      status: 'REMOVED_BY_SELLER',
    });
    return response.data;
  },
  getPurchaseStatus: async (productId: string) => {
    const response = await api.get<ApiResponse<{
      hasPurchased: boolean;
      canPurchase: boolean;
      isActive?: boolean;
      expiresAt?: string;
      orderId?: string;
      accessVia?: 'DIRECT_PURCHASE' | 'SUBSCRIPTION_PLAN';
      subscriptionPlanId?: string;
    }>>(`/api/products/${productId}/purchase-status`);
    return response.data;
  },
  getPresignedUploadUrl: async (productId: string, fileName: string, fileType: string, fileSize: number, order: number = 0) => {
    const token = await AsyncStorage.getItem('token');
    const response = await api.get<ApiResponse<{
      presignedUrl: string;
      fileKey: string;
      fileUrl: string;
      metadata: any;
    }>>(`/api/products/upload/files`, {
      params: {
        productId,
        fileName,
        fileType,
        fileSize,
        order,
      },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  },
  registerFile: async (productId: string, fileUrl: string, fileName: string, fileType: string, fileSize: number, customFileName?: string, description?: string, order: number = 0) => {
    const response = await api.post<ApiResponse<any>>(`/api/products/register-file`, {
      productId,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      customFileName,
      description,
      order,
    });
    return response.data;
  },
  deleteFile: async (productId: string, fileId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/products/${productId}/files/${fileId}`);
    return response.data;
  },
};

// API de Categorias
