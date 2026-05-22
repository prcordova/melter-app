import { api } from '../http-client';
import { SHOP_API } from '../../config/shops/api-paths';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const subscriptionPlansApi = {
  getPlans: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/subscription-plans');
    return response.data;
  },
  getShopPlans: async (username: string) => {
    const response = await api.get<ApiResponse<any[]>>(SHOP_API.subscriptionPlans(username));
    return response.data;
  },
  getPlan: async (planId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/subscription-plans/${planId}`);
    return response.data;
  },
  createPlan: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/api/subscription-plans', data);
    return response.data;
  },
  updatePlan: async (planId: string, data: any) => {
    const response = await api.put<ApiResponse<any>>(`/api/subscription-plans/${planId}`, data);
    return response.data;
  },
  deletePlan: async (planId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/subscription-plans/${planId}`);
    return response.data;
  },
  getPlanProducts: async (planId: string) => {
    const response = await api.get<ApiResponse<any[]>>(`/api/subscription-plans/${planId}/products`);
    return response.data;
  },
  /** Compra de assinatura de plano da loja (corpo: durationMonths 1 | 2 | 3 | 6 | 12) */
  purchasePlanWithDuration: async (planId: string, durationMonths: 1 | 2 | 3 | 6 | 12) => {
    const response = await api.post<ApiResponse<any>>(
      `/api/subscriptions/plans/${planId}/purchase`,
      { durationMonths }
    );
    return response.data;
  },
  getMySubscriptionStatusForPlan: async (planId: string) => {
    const response = await api.get<ApiResponse<{
      hasActiveSubscription: boolean;
      isCancelled?: boolean;
      daysRemaining?: number;
      expiresAt?: string | null;
      orderId?: string | null;
    }>>(`/api/subscriptions/plans/${planId}/status`);
    return response.data;
  },
};

// API de Analytics da Loja
