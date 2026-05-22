import { SHOP_ANALYTICS_API } from '../../../config/shops/analytics/api-paths';
import type { ApiResponse } from '../../shared/types';
import { api } from '../../http-client';

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

    const url = `${SHOP_ANALYTICS_API.me}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<ApiResponse<any>>(url);
    return response.data;
  },
};
